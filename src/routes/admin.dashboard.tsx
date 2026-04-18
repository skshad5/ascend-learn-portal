import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Users,
  GraduationCap,
  ClipboardList,
  DollarSign,
  Activity,
  TrendingUp,
} from "lucide-react";
import { StatsCard } from "@/components/StatsCard";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { getInitials } from "@/hooks/use-profile";

export const Route = createFileRoute("/admin/dashboard")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [users, courses, enrollments, pending, paid] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("courses").select("*", { count: "exact", head: true }),
        supabase.from("enrollments").select("*", { count: "exact", head: true }),
        supabase
          .from("courses")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("enrollments")
          .select("course:courses(price)")
          .eq("payment_status", "paid"),
      ]);
      const revenue = (paid.data ?? []).reduce((sum, row) => {
        const price =
          (row.course as unknown as { price: number } | null)?.price ?? 0;
        return sum + price;
      }, 0);
      return {
        users: users.count ?? 0,
        courses: courses.count ?? 0,
        enrollments: enrollments.count ?? 0,
        pending: pending.count ?? 0,
        revenue,
      };
    },
  });

  const { data: recent } = useQuery({
    queryKey: ["admin-recent-activity"],
    queryFn: async () => {
      const [enr, newCourses] = await Promise.all([
        supabase
          .from("enrollments")
          .select("id, enrolled_at, user_id, course:courses(title)")
          .order("enrolled_at", { ascending: false })
          .limit(5),
        supabase
          .from("courses")
          .select("id, title, status, created_at")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);
      const userIds = Array.from(new Set((enr.data ?? []).map((e) => e.user_id)));
      let profiles: { id: string; full_name: string | null; avatar_url: string | null }[] = [];
      if (userIds.length > 0) {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", userIds);
        profiles = data ?? [];
      }
      return {
        enrollments: (enr.data ?? []).map((e) => ({
          ...e,
          profile: profiles.find((p) => p.id === e.user_id),
        })),
        newCourses: newCourses.data ?? [],
      };
    },
  });

  const { data: top } = useQuery({
    queryKey: ["admin-top"],
    queryFn: async () => {
      const { data: enrollRows } = await supabase
        .from("enrollments")
        .select("course_id, course:courses(id, title, instructor_id)");
      const counts = new Map<
        string,
        { count: number; title: string; instructorId: string }
      >();
      const instructorCounts = new Map<string, number>();
      (enrollRows ?? []).forEach((e) => {
        const c = e.course as unknown as {
          id: string;
          title: string;
          instructor_id: string;
        } | null;
        if (!c) return;
        const cur = counts.get(c.id);
        counts.set(c.id, {
          count: (cur?.count ?? 0) + 1,
          title: c.title,
          instructorId: c.instructor_id,
        });
        instructorCounts.set(
          c.instructor_id,
          (instructorCounts.get(c.instructor_id) ?? 0) + 1,
        );
      });
      const topCourses = Array.from(counts.entries())
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      const topInstructorIds = Array.from(instructorCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      let instructorProfiles: {
        id: string;
        full_name: string | null;
        avatar_url: string | null;
      }[] = [];
      if (topInstructorIds.length > 0) {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in(
            "id",
            topInstructorIds.map(([id]) => id),
          );
        instructorProfiles = data ?? [];
      }
      const topInstructors = topInstructorIds.map(([id, count]) => ({
        id,
        count,
        profile: instructorProfiles.find((p) => p.id === id),
      }));
      return { topCourses, topInstructors };
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Admin overview</h1>
        <p className="mt-1 text-muted-foreground">Platform-wide stats.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatsCard icon={Users} label="Total users" value={stats?.users ?? 0} />
        <StatsCard icon={BookOpen} label="Total courses" value={stats?.courses ?? 0} />
        <StatsCard icon={GraduationCap} label="Enrollments" value={stats?.enrollments ?? 0} />
        <StatsCard icon={ClipboardList} label="Pending review" value={stats?.pending ?? 0} />
        <StatsCard
          icon={DollarSign}
          label="Revenue"
          value={`$${(stats?.revenue ?? 0).toFixed(2).replace(/\.00$/, "")}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/50 bg-card">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary-glow" />
              <h2 className="font-display text-lg font-semibold">Recent activity</h2>
            </div>
            <div className="space-y-3">
              {(recent?.enrollments ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">No recent enrollments.</p>
              )}
              {recent?.enrollments.map((e) => (
                <div key={e.id} className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    {e.profile?.avatar_url && (
                      <AvatarImage src={e.profile.avatar_url} alt="" />
                    )}
                    <AvatarFallback className="text-xs">
                      {getInitials(e.profile?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">
                      <span className="font-medium">
                        {e.profile?.full_name ?? "Someone"}
                      </span>{" "}
                      enrolled in{" "}
                      <span className="text-muted-foreground">
                        {(e.course as unknown as { title: string } | null)?.title ?? "a course"}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(e.enrolled_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
              <div className="my-3 border-t border-border/50" />
              {recent?.newCourses.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0 flex-1 truncate">
                    New course: <span className="font-medium">{c.title}</span>
                  </div>
                  <Badge
                    variant={
                      c.status === "approved"
                        ? "default"
                        : c.status === "pending"
                          ? "secondary"
                          : "destructive"
                    }
                  >
                    {c.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary-glow" />
              <h2 className="font-display text-lg font-semibold">Top performers</h2>
            </div>
            <div className="space-y-4">
              <div>
                <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                  Top courses
                </div>
                {(top?.topCourses ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">No enrollments yet.</p>
                )}
                {top?.topCourses.map((c, i) => (
                  <Link
                    key={c.id}
                    to="/courses/$courseId"
                    params={{ courseId: c.id }}
                    className="flex items-center justify-between gap-2 rounded p-1 text-sm hover:bg-muted/40"
                  >
                    <span className="truncate">
                      {i + 1}. {c.title}
                    </span>
                    <Badge variant="secondary">{c.count} enrolled</Badge>
                  </Link>
                ))}
              </div>
              <div>
                <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                  Top instructors
                </div>
                {(top?.topInstructors ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">No data yet.</p>
                )}
                {top?.topInstructors.map((i) => (
                  <div key={i.id} className="flex items-center gap-3 py-1">
                    <Avatar className="h-7 w-7">
                      {i.profile?.avatar_url && (
                        <AvatarImage src={i.profile.avatar_url} alt="" />
                      )}
                      <AvatarFallback className="text-xs">
                        {getInitials(i.profile?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 truncate text-sm">
                      {i.profile?.full_name ?? "Instructor"}
                    </div>
                    <Badge variant="secondary">{i.count} enrolled</Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
