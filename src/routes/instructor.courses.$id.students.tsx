import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/instructor/courses/$id/students")({
  component: CourseStudentsPage,
});

function CourseStudentsPage() {
  const { id } = Route.useParams();

  const { data: students } = useQuery({
    queryKey: ["course-students", id],
    queryFn: async () => {
      const { data: enr } = await supabase.from("enrollments").select("user_id, enrolled_at").eq("course_id", id);
      if (!enr || enr.length === 0) return [];
      const userIds = enr.map((e) => e.user_id);
      const { data: profs } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds);

      const { data: lessons } = await supabase.from("lessons").select("id").eq("course_id", id);
      const lessonIds = (lessons ?? []).map((l) => l.id);

      return enr.map((e) => {
        const p = profs?.find((p) => p.id === e.user_id);
        return { ...e, profile: p, lessonIds };
      });
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Enrolled students</h1>
      {students && students.length > 0 ? (
        <div className="grid gap-3">
          {students.map((s) => (
            <Card key={s.user_id} className="border-border/50 bg-card">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <div className="font-medium">{s.profile?.full_name ?? "Anonymous"}</div>
                  <div className="text-xs text-muted-foreground">Enrolled {new Date(s.enrolled_at).toLocaleDateString()}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No students yet" description="Once people enroll, they'll appear here." />
      )}
    </div>
  );
}
