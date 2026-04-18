import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Users, ClipboardList, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/StatsCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/instructor/dashboard")({
  component: InstructorDashboard,
});

function InstructorDashboard() {
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["instructor-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;
      const { data: courses } = await supabase
        .from("courses")
        .select("id, status")
        .eq("instructor_id", user.id);
      const courseIds = (courses ?? []).map((c) => c.id);
      let students = 0;
      let lessons = 0;
      if (courseIds.length > 0) {
        const { count: sc } = await supabase
          .from("enrollments")
          .select("*", { count: "exact", head: true })
          .in("course_id", courseIds);
        students = sc ?? 0;
        const { count: lc } = await supabase
          .from("lessons")
          .select("*", { count: "exact", head: true })
          .in("course_id", courseIds);
        lessons = lc ?? 0;
      }
      return {
        total: courses?.length ?? 0,
        approved: courses?.filter((c) => c.status === "approved").length ?? 0,
        pending: courses?.filter((c) => c.status === "pending").length ?? 0,
        students,
        lessons,
      };
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Welcome back</h1>
          <p className="mt-1 text-muted-foreground">Here's an overview of your teaching.</p>
        </div>
        <Button asChild className="bg-gradient-primary"><Link to="/instructor/courses/new"><PlusCircle className="mr-2 h-4 w-4" />New course</Link></Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard icon={BookOpen} label="Total courses" value={stats?.total ?? 0} />
        <StatsCard icon={ClipboardList} label="Total lessons" value={stats?.lessons ?? 0} />
        <StatsCard icon={Users} label="Enrolled students" value={stats?.students ?? 0} />
        <StatsCard icon={BookOpen} label="Pending review" value={stats?.pending ?? 0} />
      </div>

      <div className="rounded-xl border border-border/50 bg-card p-6">
        <h2 className="font-display text-lg font-semibold">Quick actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button asChild variant="outline"><Link to="/instructor/courses">Manage courses</Link></Button>
          <Button asChild variant="outline"><Link to="/instructor/courses/new">Create new course</Link></Button>
        </div>
      </div>
    </div>
  );
}
