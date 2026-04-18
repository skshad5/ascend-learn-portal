import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ThumbnailUpload } from "@/components/ThumbnailUpload";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/instructor/courses/$id/edit")({
  component: EditCoursePage,
});

function EditCoursePage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [level, setLevel] = useState("beginner");
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState("0");

  const { data: course } = useQuery({
    queryKey: ["edit-course", id],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("*").eq("id", id).maybeSingle();
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["all-categories"],
    queryFn: async () => (await supabase.from("categories").select("id, name").order("name")).data ?? [],
  });

  useEffect(() => {
    if (course) {
      setTitle(course.title);
      setDescription(course.description ?? "");
      setThumbnail(course.thumbnail ?? "");
      setCategoryId(course.category_id ?? "");
      setLevel(course.level);
      setIsFree(course.is_free);
      setPrice(String(course.price));
    }
  }, [course]);

  const update = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("courses")
        .update({
          title,
          description,
          thumbnail: thumbnail || null,
          category_id: categoryId || null,
          level,
          is_free: isFree,
          price: isFree ? 0 : Number(price) || 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Course updated");
      qc.invalidateQueries({ queryKey: ["edit-course", id] });
      qc.invalidateQueries({ queryKey: ["my-courses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    update.mutate();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-display text-3xl font-bold">Edit course</h1>
      <Card className="border-border/50 bg-card">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Title</Label><Input required value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
            <div className="space-y-2"><Label>Thumbnail URL</Label><Input type="url" value={thumbnail} onChange={(e) => setThumbnail(e.target.value)} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger><SelectValue placeholder="Pick category" /></SelectTrigger>
                  <SelectContent>{categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Level</Label>
                <Select value={level} onValueChange={setLevel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="text-sm font-medium">Free course</div>
              <Switch checked={isFree} onCheckedChange={setIsFree} />
            </div>
            {!isFree && <div className="space-y-2"><Label>Price (USD)</Label><Input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} /></div>}
            <Button type="submit" disabled={update.isPending} className="w-full bg-gradient-primary">{update.isPending ? "Saving..." : "Save changes"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
