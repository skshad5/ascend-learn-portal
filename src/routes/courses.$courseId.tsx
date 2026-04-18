import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, CheckCircle2, Clock, PlayCircle, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PublicHeader } from "@/components/PublicHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/courses/$courseId")({
  component: CourseDetailPage,
});

function CourseDetailPage() {
  const { courseId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: course, isLoading } = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*, category:categories(name, slug), instructor:profiles!courses_instructor_id_fkey(full_name, avatar_url)")
        .eq("id", courseId)
        .maybeSingle();
      if (error) throw error;
      return data;
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
