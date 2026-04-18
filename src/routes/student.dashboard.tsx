import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Award, BookOpen, ClipboardList, Download, PlayCircle, Trophy, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { DashboardSkeleton } from "@/components/skeletons";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/hooks/use-profile";
import { generateCertificate } from "@/lib/certificate";
import { studentEnrollmentsQueryOptions } from "@/lib/queries";
import { toast } from "sonner";

export const Route = createFileRoute("/student/dashboard")({
  component: StudentDashboard,
});

function StudentDashboard() {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  const { data: enrolled, isLoading } = useQuery(studentEnrollmentsQueryOptions(user?.id));

  const enrolledCourseIds = (enrolled ?? []).map((e) => e.course_id);
  const { data: certificates, isLoading: certsLoading } = useQuery({
    queryKey: ["my-certificates", user?.id, enrolledCourseIds.join(",")],
    enabled: !!user && enrolledCourseIds.length > 0,
    queryFn: async () => {
      if (!user || enrolledCourseIds.length === 0) return [];

      const { data: quizzes } = await supabase
        .from("quizzes")
        .select("id, course_id, passing_score")
        .in("course_id", enrolledCourseIds);

      const quizIds = (quizzes ?? []).map((q) => q.id);
      const { data: attempts } = quizIds.length
        ? await supabase
            .from("quiz_attempts")
            .select("quiz_id, score")
            .eq("user_id", user.id)
            .in("quiz_id", quizIds)
        : { data: [] };

      const bestByQuiz = new Map<string, number>();
      for (const a of attempts ?? []) {
        const prev = bestByQuiz.get(a.quiz_id);
        if (prev === undefined || a.score > prev) bestByQuiz.set(a.quiz_id, a.score);
      }

      const completed: {
        courseId: string;
        title: string;
        thumbnail: string | null;
        instructorName: string;
        completedAt: Date;
      }[] = [];

      for (const e of enrolled ?? []) {
        if (e.total === 0 || e.completed < e.total) continue;
        const courseQuizzes = (quizzes ?? []).filter((q) => q.course_id === e.course_id);
        const allPassed = courseQuizzes.every((q) => {
          const best = bestByQuiz.get(q.id);
          return best !== undefined && best >= q.passing_score;
        });
        if (!allPassed) continue;

        const course = e.course as {
          id: string;
          title: string;
          thumbnail: string | null;
        } | null;
        if (!course) continue;

        const { data: courseRow } = await supabase
          .from("courses")
          .select("instructor_id")
          .eq("id", e.course_id)
          .maybeSingle();
        let instructorName = "Instructor";
        if (courseRow?.instructor_id) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", courseRow.instructor_id)
            .maybeSingle();
          instructorName = prof?.full_name || "Instructor";
        }

        completed.push({
          courseId: e.course_id,
          title: course.title,
          thumbnail: course.thumbnail,
          instructorName,
          completedAt: new Date(e.enrolled_at),
        });
      }

      return completed;
    },
  });

  const handleDownload = (c: {
    title: string;
    instructorName: string;
    completedAt: Date;
  }) => {
    generateCertificate({
      studentName: profile?.full_name || user?.email || "Student",
      courseTitle: c.title,
      instructorName: c.instructorName,
      completionDate: c.completedAt,
    });
    toast.success("Certificate downloaded!");
  };

  const { data: quizAttempts, isLoading: attemptsLoading } = useQuery({
    queryKey: ["my-quiz-attempts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("quiz_attempts")
        .select("id, score, submitted_at, quiz_id, quiz:quizzes(id, title, passing_score, course_id, course:courses(id, title))")
        .eq("user_id", user.id)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      // Group by quiz_id, keep best score
      const byQuiz = new Map<string, (typeof data)[number]>();
      for (const a of data ?? []) {
        const prev = byQuiz.get(a.quiz_id);
        if (!prev || a.score > prev.score) byQuiz.set(a.quiz_id, a);
      }
      return Array.from(byQuiz.values()).slice(0, 6);
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">My learning</h1>
        <p className="mt-1 text-muted-foreground">Continue where you left off.</p>
      </div>

      {isLoading ? (
        <DashboardSkeleton count={3} />
      ) : enrolled && enrolled.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {enrolled.map((e) => {
            const pct = e.total > 0 ? Math.round((e.completed / e.total) * 100) : 0;
            const course = e.course as { id: string; title: string; thumbnail: string | null; description: string | null } | null;
            if (!course) return null;
            return (
              <Card key={e.course_id} className="overflow-hidden border-border/50 bg-card">
                <div className="relative aspect-video bg-gradient-primary">
                  {course.thumbnail && <img src={course.thumbnail} alt={course.title} className="h-full w-full object-cover" />}
                </div>
                <CardContent className="space-y-3 p-4">
                  <h3 className="line-clamp-1 font-semibold">{course.title}</h3>
                  <Progress value={pct} className="h-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{e.completed} / {e.total} lessons</span>
                    <span>{pct}%</span>
                  </div>
                  {e.firstLessonId && (
                    <Button asChild className="w-full bg-gradient-primary">
                      <Link to="/student/learn/$courseId/$lessonId" params={{ courseId: e.course_id, lessonId: e.firstLessonId }}>
                        <PlayCircle className="mr-2 h-4 w-4" />Continue
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={BookOpen}
          title="No enrollments yet"
          description="Browse the catalog and enroll in your first course."
          action={<Button asChild className="bg-gradient-primary"><Link to="/courses">Browse courses</Link></Button>}
        />
      )}

      {/* Quiz attempts */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">Quiz attempts</h2>
        </div>
        {attemptsLoading ? (
          <DashboardSkeleton count={2} />
        ) : quizAttempts && quizAttempts.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {quizAttempts.map((a) => {
              const quiz = a.quiz as
                | { id: string; title: string; passing_score: number; course_id: string; course: { id: string; title: string } | null }
                | null;
              if (!quiz) return null;
              const passed = a.score >= quiz.passing_score;
              return (
                <Card key={a.id} className="border-border/50 bg-card">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                        passed ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                      }`}
                    >
                      {passed ? <Trophy className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="line-clamp-1 font-semibold">{quiz.title}</h3>
                        <Badge
                          variant={passed ? "default" : "destructive"}
                          className={passed ? "bg-success text-success-foreground" : ""}
                        >
                          {a.score}%
                        </Badge>
                      </div>
                      <p className="line-clamp-1 text-xs text-muted-foreground">
                        {quiz.course?.title ?? "Course"} • Best of attempts •{" "}
                        {new Date(a.submitted_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link to="/student/quiz/$quizId" params={{ quizId: quiz.id }}>
                        Retake
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={ClipboardList}
            title="No quiz attempts yet"
            description="Take a quiz from one of your enrolled courses to see your scores here."
          />
        )}
      </div>

      {/* Certificates */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">Certificates</h2>
        </div>
        {certsLoading ? (
          <DashboardSkeleton count={2} />
        ) : certificates && certificates.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {certificates.map((c) => (
              <Card key={c.courseId} className="overflow-hidden border-border/50 bg-card">
                <div className="relative aspect-video bg-gradient-primary">
                  {c.thumbnail && (
                    <img
                      src={c.thumbnail}
                      alt={c.title}
                      className="h-full w-full object-cover opacity-80"
                    />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-background/80 to-transparent">
                    <Award className="h-10 w-10 text-success drop-shadow" />
                  </div>
                </div>
                <CardContent className="space-y-3 p-4">
                  <div>
                    <h3 className="line-clamp-1 font-semibold">{c.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      Completed {c.completedAt.toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleDownload(c)}
                    variant="outline"
                    className="w-full border-success/40 bg-success/10 text-success hover:bg-success/15 hover:text-success"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download certificate
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Award}
            title="No certificates yet"
            description="Complete every lesson and pass every quiz in a course to earn a certificate."
          />
        )}
      </div>
    </div>
  );
}
