import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ChevronLeft, Circle, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoPlayer } from "@/components/VideoPlayer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/student/learn/$courseId/$lessonId")({
  component: LearnPage,
});

function LearnPage() {
  const { courseId, lessonId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: lessons } = useQuery({
    queryKey: ["course-lessons", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id, title, order_index, video_url, video_type, description")
        .eq("course_id", courseId)
        .order("order_index");
      if (error) throw error;
      return data;
    },
  });

  const { data: progress } = useQuery({
    queryKey: ["progress", courseId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const lessonIds = (lessons ?? []).map((l) => l.id);
      if (lessonIds.length === 0) return [];
      const { data, error } = await supabase
        .from("lesson_progress")
        .select("lesson_id, completed")
        .eq("user_id", user.id)
        .in("lesson_id", lessonIds);
      if (error) throw error;
      return data;
    },
  });

  const { data: quizzes } = useQuery({
    queryKey: ["course-quizzes", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quizzes")
        .select("id, title, passing_score")
        .eq("course_id", courseId)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const current = lessons?.find((l) => l.id === lessonId);
  const isCompleted = progress?.find((p) => p.lesson_id === lessonId)?.completed;

  const markComplete = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("lesson_progress")
        .upsert(
          { user_id: user.id, lesson_id: lessonId, completed: true, completed_at: new Date().toISOString() },
          { onConflict: "user_id,lesson_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lesson marked complete!");
      qc.invalidateQueries({ queryKey: ["progress", courseId] });
      qc.invalidateQueries({ queryKey: ["my-enrollments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/60 bg-card/40">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/student/dashboard"><ChevronLeft className="mr-1 h-4 w-4" />Back</Link>
          </Button>
          <div className="font-display text-sm font-semibold">{current?.title}</div>
          <Button
            disabled={isCompleted || markComplete.isPending}
            onClick={() => markComplete.mutate()}
            size="sm"
            className="bg-gradient-primary"
          >
            {isCompleted ? <><CheckCircle2 className="mr-1 h-4 w-4" />Completed</> : "Mark complete"}
          </Button>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[1fr_320px]">
        <div>
          {current?.video_url ? (
            <VideoPlayer url={current.video_url} type={current.video_type as "url" | "upload"} />
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-xl bg-muted text-muted-foreground">
              No video for this lesson
            </div>
          )}
          {current?.description && (
            <div className="mt-6 rounded-xl border border-border/50 bg-card p-6">
              <h2 className="mb-2 font-display text-lg font-semibold">About this lesson</h2>
              <p className="text-sm text-muted-foreground">{current.description}</p>
            </div>
          )}
        </div>

        <aside className="space-y-1 rounded-xl border border-border/50 bg-card p-3">
          <div className="px-2 py-2 font-display text-sm font-semibold">Lessons</div>
          {lessons?.map((l) => {
            const done = progress?.find((p) => p.lesson_id === l.id)?.completed;
            const active = l.id === lessonId;
            return (
              <Link
                key={l.id}
                to="/student/learn/$courseId/$lessonId"
                params={{ courseId, lessonId: l.id }}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${active ? "bg-primary/15 text-foreground" : "hover:bg-muted/50"}`}
              >
                {done ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                <span className="line-clamp-1">{l.title}</span>
              </Link>
            );
          })}
          {quizzes && quizzes.length > 0 && (
            <>
              <div className="mt-3 px-2 py-2 font-display text-sm font-semibold">Quizzes</div>
              {quizzes.map((q) => (
                <Link
                  key={q.id}
                  to="/student/quiz/$quizId"
                  params={{ quizId: q.id }}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted/50"
                >
                  <ClipboardList className="h-4 w-4 text-primary-glow" />
                  <span className="line-clamp-1">{q.title}</span>
                </Link>
              ))}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
