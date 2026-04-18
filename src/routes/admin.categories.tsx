import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Pencil, Plus, Trash2, FolderTree } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/categories")({
  component: AdminCategoriesPage,
});

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function AdminCategoriesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  const { data: categories } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name, slug, courses:courses(count)")
        .order("name");
      return data ?? [];
    },
  });

  const upsert = useMutation({
    mutationFn: async () => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Name is required");
      const finalSlug = (slug.trim() || slugify(trimmed)) || slugify(trimmed);
      if (editing) {
        const { error } = await supabase
          .from("categories")
          .update({ name: trimmed, slug: finalSlug })
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("categories")
          .insert({ name: trimmed, slug: finalSlug });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Category updated" : "Category created");
      setOpen(false);
      setEditing(null);
      setName("");
      setSlug("");
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["home-categories"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Category deleted");
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditing(null);
    setName("");
    setSlug("");
    setOpen(true);
  };

  const openEdit = (c: { id: string; name: string; slug: string }) => {
    setEditing(c);
    setName(c.name);
    setSlug(c.slug);
    setOpen(true);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    upsert.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Categories</h1>
          <p className="mt-1 text-muted-foreground">Organize your catalog.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} className="bg-gradient-primary">
              <Plus className="mr-2 h-4 w-4" />New category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit category" : "New category"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cat-name">Name</Label>
                <Input
                  id="cat-name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!editing) setSlug(slugify(e.target.value));
                  }}
                  maxLength={80}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-slug">Slug</Label>
                <Input
                  id="cat-slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  maxLength={80}
                  placeholder="auto-from-name"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={upsert.isPending} className="bg-gradient-primary">
                  {upsert.isPending ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {categories?.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card/30 p-10 text-center text-muted-foreground">
            <FolderTree className="mx-auto mb-2 h-8 w-8 text-primary-glow/60" />
            No categories yet. Create your first one.
          </div>
        )}
        {categories?.map((c) => {
          const count = (c.courses as unknown as { count: number }[] | null)?.[0]?.count ?? 0;
          return (
            <Card key={c.id} className="border-border/50 bg-card">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary-glow">
                    <FolderTree className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      /{c.slug} • {count} {count === 1 ? "course" : "courses"}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(c)}>
                    <Pencil className="mr-1 h-4 w-4" />Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (count > 0) {
                        toast.error(`Reassign ${count} course(s) before deleting.`);
                        return;
                      }
                      if (confirm(`Delete category "${c.name}"?`)) remove.mutate(c.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
