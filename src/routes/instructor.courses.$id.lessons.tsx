import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Upload, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/instructor/courses/$id/lessons")({
  component: LessonsBuilderPage,
});

function LessonsBuilderPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoType, setVideoType] = useState<"url" | "upload">("url");
  const [videoUrl, setVideoUrl] = useState("");
  const [duration, setDuration] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: lessons } = useQuery({
    queryKey: ["builder-lessons", id],
    queryFn: async () => {
      const { data } = await supabase.from("lessons").select("*").eq("course_id", id).order("order_index");
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const orderIndex = (lessons?.length ?? 0);
      const { error } = await supabase.from("lessons").insert({
        course_id: id,
        title,
        description: description || null,
        video_url: videoUrl || null,
        video_type: videoType,
        duration: duration ? Number(duration) : null,
        order_index: orderIndex,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lesson added");
      setTitle(""); setDescription(""); setVideoUrl(""); setDuration("");
      qc.invalidateQueries({ queryKey: ["builder-lessons", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (lessonId: string) => {
      const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["builder-lessons", id] }),
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const path = `${user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("lesson-videos").upload(path, file);
    if (error) {
      toast.error(error.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("lesson-videos").getPublicUrl(path);
    setVideoUrl(data.publicUrl);
    setUploading(false);
    toast.success("Video uploaded");
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate();
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Lessons</h1>

      <Card className="border-border/50 bg-card">
        <CardContent className="p-6">
          <h2 className="mb-4 font-display text-lg font-semibold">Add a lesson</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Title</Label><Input required value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></div>

            <div className="space-y-2">
              <Label>Video source</Label>
              <RadioGroup value={videoType} onValueChange={(v) => { setVideoType(v as "url" | "upload"); setVideoUrl(""); }} className="grid grid-cols-2 gap-3">
                <label className={`cursor-pointer rounded-lg border p-3 text-sm ${videoType === "url" ? "border-primary bg-primary/10" : "border-border"}`}>
                  <RadioGroupItem value="url" className="sr-only" />
                  <div className="font-medium">YouTube / Vimeo URL</div>
                </label>
                <label className={`cursor-pointer rounded-lg border p-3 text-sm ${videoType === "upload" ? "border-primary bg-primary/10" : "border-border"}`}>
                  <RadioGroupItem value="upload" className="sr-only" />
                  <div className="font-medium">Upload video file</div>
                </label>
              </RadioGroup>
            </div>

            {videoType === "url" ? (
              <div className="space-y-2"><Label>Video URL</Label><Input type="url" placeholder="https://www.youtube.com/watch?v=..." value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} /></div>
            ) : (
              <div className="space-y-2">
                <Label>Video file</Label>
                <div className="flex items-center gap-3">
                  <Input type="file" accept="video/*" onChange={handleUpload} disabled={uploading} />
                  {uploading && <span className="text-xs text-muted-foreground">Uploading...</span>}
                </div>
                {videoUrl && <div className="text-xs text-success">✓ Uploaded</div>}
              </div>
            )}

            <div className="space-y-2"><Label>Duration (minutes)</Label><Input type="number" min="0" value={duration} onChange={(e) => setDuration(e.target.value)} /></div>
            <Button type="submit" disabled={create.isPending} className="bg-gradient-primary"><Plus className="mr-2 h-4 w-4" />{create.isPending ? "Adding..." : "Add lesson"}</Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {lessons?.map((l, i) => (
          <Card key={l.id} className="border-border/50 bg-card">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary-glow">{i + 1}</div>
              <div className="min-w-0 flex-1">
                <div className="font-medium">{l.title}</div>
                <div className="text-xs text-muted-foreground">{l.video_type === "upload" ? <Upload className="inline h-3 w-3" /> : null} {l.video_type} · {l.duration ?? "?"} min</div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => remove.mutate(l.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </CardContent>
          </Card>
        ))}
        {lessons?.length === 0 && <p className="text-sm text-muted-foreground">No lessons yet.</p>}
      </div>
    </div>
  );
}
