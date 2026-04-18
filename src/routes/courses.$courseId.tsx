import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Award, BookOpen, CheckCircle2, ClipboardList, Clock, PlayCircle, Trophy, User, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PublicHeader } from "@/components/PublicHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/hooks/use-profile";
import { generateCertificate } from "@/lib/certificate";
import { toast } from "sonner";

export const Route = createFileRoute("/courses/$courseId")({
  component: CourseDetailPage,
});

function CourseDetailPage() {
  const { courseId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profile } = useProfile();

  const { data: course, isLoading } = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*, category:categories(name, slug)")
        .eq("id", courseId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const { data: instructor } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", data.instructor_id)
        .maybeSingle();
      return { ...data, instructor };
    },
  });

  const { data: lessons } = useQuery({
    queryKey: ["lessons", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id, title, duration, order_index")
        .eq("course_id", courseId)
        .order("order_index");
      if (error) throw error;
      return data;
    },
  });

  const { data: enrollment } = useQuery({
    queryKey: ["enrollment", courseId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("enrollments")
        .select("id")
        .eq("course_id", courseId)
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: quizzes } = useQuery({
    queryKey: ["course-quizzes", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quizzes")
        .select("id, title, passing_score")
        .eq("course_id", courseId)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const quizIds = (quizzes ?? []).map((q) => q.id);
  const { data: attempts } = useQuery({
    queryKey: ["course-quiz-attempts", courseId, user?.id, quizIds.join(",")],
    enabled: !!user && quizIds.length > 0,
    queryFn: async () => {
      if (!user || quizIds.length === 0) return [];
      const { data, error } = await supabase
        .from("quiz_attempts")
        .select("id, quiz_id, score, submitted_at")
        .eq("user_id", user.id)
        .in("quiz_id", quizIds)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const lessonIds = (lessons ?? []).map((l) => l.id);
  const { data: progress } = useQuery({
    queryKey: ["course-progress", courseId, user?.id, lessonIds.join(",")],
    enabled: !!user && lessonIds.length > 0,
    queryFn: async () => {
      if (!user || lessonIds.length === 0) return [];
      const { data, error } = await supabase
        .from("lesson_progress")
        .select("lesson_id, completed")
        .eq("user_id", user.id)
        .eq("completed", true)
        .in("lesson_id", lessonIds);
      if (error) throw error;
      return data;
    },
  });

  const enroll = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("enrollments").insert({
        user_id: user.id,
        course_id: courseId,
        payment_status: course?.is_free ? "free" : "paid",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Enrolled successfully!");
      qc.invalidateQueries({ queryKey: ["enrollment", courseId] });
      if (lessons && lessons.length > 0) {
        navigate({ to: "/student/learn/$courseId/$lessonId", params: { courseId, lessonId: lessons[0].id } });
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <PublicHeader />
        <div className="mx-auto max-w-5xl animate-pulse px-4 py-12">
          <div className="h-8 w-2/3 rounded bg-card" />
          <div className="mt-6 aspect-video rounded-xl bg-card" />
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background">
        <PublicHeader />
        <div className="mx-auto max-w-5xl px-4 py-20 text-center">
          <h1 className="font-display text-2xl font-bold">Course not found</h1>
          <Button asChild className="mt-6"><Link to="/courses">Browse courses</Link></Button>
        </div>
      </div>
    );
  }

  const handleEnroll = () => {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (!course.is_free) {
      toast.info("Paid checkout coming soon — enrolling for now.");
    }
    enroll.mutate();
  };

  const completedLessons = (progress ?? []).length;
  const totalLessons = lessons?.length ?? 0;
  const allLessonsDone = totalLessons > 0 && completedLessons >= totalLessons;
  const allQuizzesPassed =
    (quizzes?.length ?? 0) === 0 ||
    (quizzes ?? []).every((q) => {
      const my = (attempts ?? []).filter((a) => a.quiz_id === q.id);
      if (my.length === 0) return false;
      const best = my.reduce((m, a) => (a.score > m.score ? a : m));
      return best.score >= q.passing_score;
    });
  const courseComplete = !!enrollment && allLessonsDone && allQuizzesPassed;

  const handleDownloadCertificate = () => {
    if (!course) return;
    generateCertificate({
      studentName: profile?.full_name || user?.email || "Student",
      courseTitle: course.title,
      instructorName: course.instructor?.full_name || "Instructor",
      completionDate: new Date(),
    });
    toast.success("Certificate downloaded!");
  };

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Badge variant="outline" className="mb-3">{course.category?.name ?? "Uncategorized"}</Badge>
            <h1 className="font-display text-3xl font-bold sm:text-4xl">{course.title}</h1>
            <p className="mt-4 text-muted-foreground">{course.description}</p>

            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><User className="h-4 w-4" />{course.instructor?.full_name ?? "Instructor"}</span>
              <span className="inline-flex items-center gap-1.5"><BookOpen className="h-4 w-4" />{lessons?.length ?? 0} lessons</span>
              <Badge variant="secondary">{course.level}</Badge>
            </div>

            <h2 className="mt-10 font-display text-xl font-bold">Curriculum</h2>
            <div className="mt-4 space-y-2">
              {lessons?.length ? lessons.map((l, i) => (
                <div key={l.id} className="flex items-center gap-3 rounded-lg border border-border/50 bg-card p-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary-glow">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{l.title}</div>
                    {l.duration && <div className="text-xs text-muted-foreground">{l.duration} min</div>}
                  </div>
                  <PlayCircle className="h-5 w-5 text-muted-foreground" />
                </div>
              )) : <p className="text-sm text-muted-foreground">No lessons published yet.</p>}
            </div>

            {quizzes && quizzes.length > 0 && (
              <>
                <h2 className="mt-10 font-display text-xl font-bold">Quizzes</h2>
                <div className="mt-4 space-y-2">
                  {quizzes.map((q) => {
                    const myAttempts = (attempts ?? []).filter((a) => a.quiz_id === q.id);
                    const best = myAttempts.length
                      ? myAttempts.reduce((m, a) => (a.score > m.score ? a : m))
                      : null;
                    const passed = best ? best.score >= q.passing_score : false;
                    return (
                      <div
                        key={q.id}
                        className="flex flex-wrap items-center gap-3 rounded-lg border border-border/50 bg-card p-4"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary-glow">
                          <ClipboardList className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{q.title}</div>
                          <div className="text-xs text-muted-foreground">
                            Passing score {q.passing_score}%
                            {best && (
                              <>
                                {" • "}
                                Best {best.score}% • {myAttempts.length} attempt
                                {myAttempts.length === 1 ? "" : "s"}
                              </>
                            )}
                          </div>
                        </div>
                        {best && (
                          <Badge
                            variant={passed ? "default" : "destructive"}
                            className={passed ? "bg-success text-success-foreground" : ""}
                          >
                            {passed ? (
                              <>
                                <Trophy className="mr-1 h-3 w-3" />
                                Passed
                              </>
                            ) : (
                              <>
                                <XCircle className="mr-1 h-3 w-3" />
                                Failed
                              </>
                            )}
                          </Badge>
                        )}
                        <Button
                          asChild
                          size="sm"
                          variant={enrollment ? "default" : "outline"}
                          className={enrollment ? "bg-gradient-primary" : ""}
                          disabled={!user}
                        >
                          {user ? (
                            <Link to="/student/quiz/$quizId" params={{ quizId: q.id }}>
                              {best ? "Retake quiz" : "Take quiz"}
                            </Link>
                          ) : (
                            <Link to="/login">Sign in to take</Link>
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <aside>
            <div className="sticky top-20 overflow-hidden rounded-2xl border border-border/50 bg-card shadow-elegant">
              <div className="aspect-video bg-gradient-primary">
                {course.thumbnail && <img src={course.thumbnail} alt={course.title} className="h-full w-full object-cover" />}
              </div>
              <div className="p-6">
                <div className="font-display text-3xl font-bold">
                  {course.is_free ? "Free" : `$${course.price}`}
                </div>
                {enrollment ? (
                  <Button asChild className="mt-4 w-full bg-gradient-primary shadow-glow">
                    <Link to="/student/learn/$courseId/$lessonId" params={{ courseId, lessonId: lessons?.[0]?.id ?? "" }}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />Continue learning
                    </Link>
                  </Button>
                ) : (
                  <Button onClick={handleEnroll} disabled={enroll.isPending} className="mt-4 w-full bg-gradient-primary shadow-glow">
                    {enroll.isPending ? "Enrolling..." : course.is_free ? "Enroll for free" : "Buy course"}
                  </Button>
                )}
                {enrollment && (
                  <div className="mt-4 rounded-lg border border-border/50 bg-muted/30 p-3">
                    <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Course progress</span>
                      <span>
                        {completedLessons}/{totalLessons} lessons
                        {(quizzes?.length ?? 0) > 0 && ` • ${allQuizzesPassed ? "all" : "not all"} quizzes passed`}
                      </span>
                    </div>
                    {courseComplete ? (
                      <Button
                        onClick={handleDownloadCertificate}
                        variant="outline"
                        className="w-full border-success/40 bg-success/10 text-success hover:bg-success/15 hover:text-success"
                      >
                        <Award className="mr-2 h-4 w-4" />
                        Download certificate
                      </Button>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Complete every lesson{(quizzes?.length ?? 0) > 0 ? " and pass every quiz" : ""} to unlock your certificate.
                      </p>
                    )}
                  </div>
                )}
                <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2"><Clock className="h-4 w-4" />Lifetime access</li>
                  <li className="flex items-center gap-2"><BookOpen className="h-4 w-4" />{lessons?.length ?? 0} lessons</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />Quizzes & progress tracking</li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
