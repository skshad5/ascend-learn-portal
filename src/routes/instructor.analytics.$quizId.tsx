import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Trophy, XCircle, ClipboardList, MinusCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/EmptyState";
import { DashboardSkeleton } from "@/components/skeletons";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { getInitials } from "@/hooks/use-profile";

export const Route = createFileRoute("/instructor/analytics/$quizId")({
  component: QuizAnalyticsDetailPage,
});

function QuizAnalyticsDetailPage() {
  const { quizId } = Route.useParams();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["instructor-quiz-detail", quizId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: quiz, error: qErr } = await supabase
        .from("quizzes")
        .select("id, title, passing_score, course_id, course:courses(id, title, instructor_id)")
        .eq("id", quizId)
        .maybeSingle();
      if (qErr) throw qErr;
      if (!quiz) return null;

      const { data: attempts, error: aErr } = await supabase
        .from("quiz_attempts")
        .select("user_id, score, submitted_at")
        .eq("quiz_id", quizId)
        .order("submitted_at", { ascending: false });
      if (aErr) throw aErr;

      const userIds = Array.from(new Set((attempts ?? []).map((a) => a.user_id)));
      let profiles: { id: string; full_name: string | null; avatar_url: string | null }[] = [];
      if (userIds.length > 0) {
        const { data: ps } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", userIds);
        profiles = ps ?? [];
      }
      const profileById = new Map(profiles.map((p) => [p.id, p]));

      const byUser = new Map<
        string,
        { userId: string; attempts: number; bestScore: number; lastAttempt: string }
      >();
      for (const a of attempts ?? []) {
        const prev = byUser.get(a.user_id);
        if (!prev) {
          byUser.set(a.user_id, {
            userId: a.user_id,
            attempts: 1,
            bestScore: a.score,
            lastAttempt: a.submitted_at,
          });
        } else {
          prev.attempts += 1;
          if (a.score > prev.bestScore) prev.bestScore = a.score;
          if (a.submitted_at > prev.lastAttempt) prev.lastAttempt = a.submitted_at;
        }
      }

      const students = Array.from(byUser.values())
        .map((s) => ({
          ...s,
          profile: profileById.get(s.userId) ?? null,
          passed: s.bestScore >= quiz.passing_score,
        }))
        .sort((a, b) => b.bestScore - a.bestScore);

      return { quiz, students, totalAttempts: (attempts ?? []).length };
    },
  });

  const quiz = data?.quiz;
  const students = data?.students ?? [];
  const passed = students.filter((s) => s.passed).length;
  const failed = students.length - passed;

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
          <Link to="/instructor/analytics">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to analytics
          </Link>
        </Button>
        {isLoading ? (
          <div className="h-8 w-1/2 animate-pulse rounded bg-card" />
        ) : quiz ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-3xl font-bold">{quiz.title}</h1>
              <Badge variant="outline">Pass {quiz.passing_score}%</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {quiz.course?.title ?? "Course"} • {students.length} student
              {students.length === 1 ? "" : "s"} • {data?.totalAttempts ?? 0} attempt
              {(data?.totalAttempts ?? 0) === 1 ? "" : "s"} • {passed} passed • {failed} failed
            </p>
          </>
        ) : (
          <h1 className="font-display text-3xl font-bold">Quiz not found</h1>
        )}
      </div>

      {isLoading ? (
        <DashboardSkeleton count={3} />
      ) : students.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No attempts yet"
          description="Once students take this quiz, their results will appear here."
        />
      ) : (
        <Card className="border-border/50 bg-card">
          <CardContent className="p-0">
            <div className="divide-y divide-border/60">
              {students.map((s) => {
                const name = s.profile?.full_name || "Student";
                return (
                  <div
                    key={s.userId}
                    className="flex flex-wrap items-center gap-3 p-4 sm:flex-nowrap"
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      {s.profile?.avatar_url ? (
                        <AvatarImage src={s.profile.avatar_url} alt={name} />
                      ) : null}
                      <AvatarFallback className="text-xs">
                        {getInitials(s.profile?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{name}</div>
                      <div className="text-xs text-muted-foreground">
                        {s.attempts} attempt{s.attempts === 1 ? "" : "s"} • Last{" "}
                        {new Date(s.lastAttempt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="font-mono">
                        Best {s.bestScore}%
                      </Badge>
                      {s.passed ? (
                        <Badge className="bg-success text-success-foreground">
                          <Trophy className="mr-1 h-3 w-3" />
                          Passed
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="mr-1 h-3 w-3" />
                          Failed
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {students.length > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MinusCircle className="h-3 w-3" />
          Best scores shown — students may have multiple attempts.
        </p>
      )}
    </div>
  );
}
