import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Users, GraduationCap, ClipboardList } from "lucide-react";
import { StatsCard } from "@/components/StatsCard";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/dashboard")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [users, courses, enrollments, pending] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("courses").select("*", { count: "exact", head: true }),
        supabase.from("enrollments").select("*", { count: "exact", head: true }),
        supabase.from("courses").select("*", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      return {
        users: users.count ?? 0,
        courses: courses.count ?? 0,
        enrollments: enrollments.count ?? 0,
        pending: pending.count ?? 0,
      };
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Admin overview</h1>
        <p className="mt-1 text-muted-foreground">Platform-wide stats.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard icon={Users} label="Total users" value={stats?.users ?? 0} />
        <StatsCard icon={BookOpen} label="Total courses" value={stats?.courses ?? 0} />
        <StatsCard icon={GraduationCap} label="Enrollments" value={stats?.enrollments ?? 0} />
        <StatsCard icon={ClipboardList} label="Pending review" value={stats?.pending ?? 0} />
      </div>
    </div>
  );
}
