import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Edit, Eye, ListVideo, ClipboardCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/instructor/courses")({
  component: MyCoursesPage,
});

function MyCoursesPage() {
  const { user } = useAuth();
  const { data: courses, isLoading } = useQuery({
    queryKey: ["my-courses", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("courses")
        .select("*, category:categories(name)")
        .eq("instructor_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">My courses</h1>
          <p className="mt-1 text-muted-foreground">Manage all your courses.</p>
        </div>
        <Button asChild className="bg-gradient-primary"><Link to="/instructor/courses/new">New course</Link></Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4">{[1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-card" />)}</div>
      ) : courses && courses.length > 0 ? (
        <div className="grid gap-4">
          {courses.map((c) => (
            <Card key={c.id} className="border-border/50 bg-card">
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                <div className="flex flex-1 items-center gap-4">
                  <div className="h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-gradient-primary">
                    {c.thumbnail && <img src={c.thumbnail} alt={c.title} className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{c.title}</h3>
                      <Badge variant={c.status === "approved" ? "default" : c.status === "pending" ? "secondary" : "destructive"}>
                        {c.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{c.category?.name ?? "Uncategorized"} · {c.is_free ? "Free" : `$${c.price}`}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline"><Link to="/instructor/courses/$id/edit" params={{ id: c.id }}><Edit className="mr-1 h-3 w-3" />Edit</Link></Button>
                  <Button asChild size="sm" variant="outline"><Link to="/instructor/courses/$id/lessons" params={{ id: c.id }}><ListVideo className="mr-1 h-3 w-3" />Lessons</Link></Button>
                  <Button asChild size="sm" variant="outline"><Link to="/instructor/courses/$id/quizzes" params={{ id: c.id }}><ClipboardCheck className="mr-1 h-3 w-3" />Quizzes</Link></Button>
                  <Button asChild size="sm" variant="outline"><Link to="/instructor/courses/$id/students" params={{ id: c.id }}><Users className="mr-1 h-3 w-3" />Students</Link></Button>
                  <Button asChild size="sm" variant="ghost"><Link to="/courses/$courseId" params={{ courseId: c.id }}><Eye className="mr-1 h-3 w-3" />View</Link></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No courses yet"
          description="Create your first course to get started teaching."
          action={<Button asChild className="bg-gradient-primary"><Link to="/instructor/courses/new">Create course</Link></Button>}
        />
      )}
    </div>
  );
}
