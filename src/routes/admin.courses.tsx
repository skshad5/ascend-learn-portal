import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, Pencil, Search, Trash2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/courses")({
  component: AdminCoursesPage,
});

function AdminCoursesPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: courses } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("*, category:categories(id, name)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["all-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name").order("name");
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (courses ?? []).filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (categoryFilter !== "all" && c.category_id !== categoryFilter) return false;
      if (term && !c.title.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [courses, q, statusFilter, categoryFilter]);

  const setStatus = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: "approved" | "rejected" | "pending";
    }) => {
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

      <Card className="border-border/50 bg-card">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-3">
          <div className="relative sm:col-span-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by title..."
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card/30 p-10 text-center text-muted-foreground">
            No courses match these filters.
          </div>
        )}
        {filtered.map((c) => (
          <Card key={c.id} className="border-border/50 bg-card">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="h-14 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gradient-primary">
                  {c.thumbnail && (
                    <img src={c.thumbnail} alt={c.title} className="h-full w-full object-cover" />
                  )}
                </div>
                <div>
                  <div className="font-medium">{c.title}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
                    {c.category?.name ?? "Uncategorized"} •{" "}
                    {c.is_free ? "Free" : `$${c.price}`}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {c.status !== "approved" && (
                  <Button
                    size="sm"
                    onClick={() => setStatus.mutate({ id: c.id, status: "approved" })}
                    className="bg-success text-success-foreground hover:bg-success/90"
                  >
                    <CheckCircle2 className="mr-1 h-4 w-4" />Approve
                  </Button>
                )}
                {c.status !== "rejected" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setStatus.mutate({ id: c.id, status: "rejected" })}
                  >
                    <XCircle className="mr-1 h-4 w-4" />Reject
                  </Button>
                )}
                <Button asChild size="sm" variant="outline">
                  <Link to="/admin/courses/$id/edit" params={{ id: c.id }}>
                    <Pencil className="mr-1 h-4 w-4" />Edit
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (confirm(`Delete "${c.title}"?`)) remove.mutate(c.id);
                  }}
                >
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
