import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/courses")({
  component: AdminCoursesPage,
});

function AdminCoursesPage() {
  const qc = useQueryClient();

  const { data: courses } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("*, category:categories(name)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" | "pending" }) => {
      const { error } = await supabase.from("courses").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Course updated");
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Course deleted");
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">All courses</h1>
      <div className="grid gap-3">
        {courses?.map((c) => (
          <Card key={c.id} className="border-border/50 bg-card">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="h-14 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gradient-primary">
                  {c.thumbnail && <img src={c.thumbnail} alt={c.title} className="h-full w-full object-cover" />}
                </div>
                <div>
                  <div className="font-medium">{c.title}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant={c.status === "approved" ? "default" : c.status === "pending" ? "secondary" : "destructive"}>{c.status}</Badge>
                    {c.category?.name ?? "Uncategorized"}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {c.status !== "approved" && (
                  <Button size="sm" onClick={() => setStatus.mutate({ id: c.id, status: "approved" })} className="bg-success text-success-foreground hover:bg-success/90">
                    <CheckCircle2 className="mr-1 h-4 w-4" />Approve
                  </Button>
                )}
                {c.status !== "rejected" && (
                  <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: c.id, status: "rejected" })}>
                    <XCircle className="mr-1 h-4 w-4" />Reject
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => remove.mutate(c.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
