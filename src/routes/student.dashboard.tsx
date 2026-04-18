import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/student/dashboard")({
  component: StudentDashboard,
});

function StudentDashboard() {
  const { user } = useAuth();

  const { data: enrolled, isLoading } = useQuery({
    queryKey: ["my-enrollments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const { data: enr, error } = await supabase
        .from("enrollments")
        .select("course_id, enrolled_at, course:courses(id, title, thumbnail, description)")
        .eq("user_id", user.id);
      if (error) throw error;

      // Fetch progress for each course
      const results = await Promise.all(
        (enr ?? []).map(async (e) => {
          const courseId = e.course_id;
          const { data: lessons } = await supabase.from("lessons").select("id").eq("course_id", courseId);
          const lessonIds = (lessons ?? []).map((l) => l.id);
          let completed = 0;
          if (lessonIds.length > 0) {
            const { count } = await supabase
              .from("lesson_progress")
              .select("*", { count: "exact", head: true })
              .eq("user_id", user.id)
              .eq("completed", true)
              .in("lesson_id", lessonIds);
            completed = count ?? 0;
          }
          return {
            ...e,
            total: lessonIds.length,
            completed,
            firstLessonId: lessonIds[0] ?? null,
          };
        }),
      );
      return results;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">My learning</h1>
        <p className="mt-1 text-muted-foreground">Continue where you left off.</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-48 animate-pulse rounded-xl bg-card" />)}
        </div>
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
    </div>
  );
}
