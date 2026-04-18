import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, TrendingUp, Users, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/EmptyState";
import { DashboardSkeleton } from "@/components/skeletons";
import { StatsCard } from "@/components/StatsCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/instructor/analytics")({
  component: InstructorAnalyticsPage,
});

interface QuizRow {
  id: string;
  title: string;
  passing_score: number;
  course_id: string;
  course_title: string;
  attempts: number;
  uniqueStudents: number;
  averageScore: number;
  passRate: number;
  bestScoresByUser: Map<string, number>;
}

function InstructorAnalyticsPage() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["instructor-quiz-analytics", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;
      const { data: courses, error: cErr } = await supabase
        .from("courses")
        .select("id, title")
        .eq("instructor_id", user.id);
      if (cErr) throw cErr;
      const courseIds = (courses ?? []).map((c) => c.id);
      if (courseIds.length === 0) return { quizzes: [] as QuizRow[], totalAttempts: 0 };

      const { data: quizzes, error: qErr } = await supabase
        .from("quizzes")
        .select("id, title, passing_score, course_id")
        .in("course_id", courseIds);
      if (qErr) throw qErr;
      const quizIds = (quizzes ?? []).map((q) => q.id);
      if (quizIds.length === 0) return { quizzes: [] as QuizRow[], totalAttempts: 0 };

      const { data: attempts, error: aErr } = await supabase
        .from("quiz_attempts")
        .select("quiz_id, user_id, score")
        .in("quiz_id", quizIds);
      if (aErr) throw aErr;

      const courseTitleById = new Map((courses ?? []).map((c) => [c.id, c.title]));

      const rows: QuizRow[] = (quizzes ?? []).map((q) => {
        const qAttempts = (attempts ?? []).filter((a) => a.quiz_id === q.id);
        const totalAttempts = qAttempts.length;
        const bestByUser = new Map<string, number>();
        for (const a of qAttempts) {
          const prev = bestByUser.get(a.user_id);
          if (prev === undefined || a.score > prev) bestByUser.set(a.user_id, a.score);
        }
        const uniqueStudents = bestByUser.size;
        const avg =
          totalAttempts === 0
            ? 0
            : Math.round(qAttempts.reduce((s, a) => s + a.score, 0) / totalAttempts);
        const passed =
          uniqueStudents === 0
            ? 0
            : Array.from(bestByUser.values()).filter((s) => s >= q.passing_score).length;
        const passRate = uniqueStudents === 0 ? 0 : Math.round((passed / uniqueStudents) * 100);

        return {
          id: q.id,
          title: q.title,
          passing_score: q.passing_score,
          course_id: q.course_id,
          course_title: courseTitleById.get(q.course_id) ?? "Course",
          attempts: totalAttempts,
          uniqueStudents,
          averageScore: avg,
          passRate,
          bestScoresByUser: bestByUser,
        };
      });

      return {
        quizzes: rows,
        totalAttempts: (attempts ?? []).length,
      };
    },
  });

  const quizzes = data?.quizzes ?? [];
  const totalAttempts = data?.totalAttempts ?? 0;
  const totalStudents = new Set(quizzes.flatMap((q) => Array.from(q.bestScoresByUser.keys()))).size;
  const overallAvg =
    quizzes.length === 0
      ? 0
      : Math.round(quizzes.reduce((s, q) => s + q.averageScore, 0) / quizzes.length);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Quiz analytics</h1>
        <p className="mt-1 text-muted-foreground">
          See how students are performing on quizzes across your courses.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard icon={ClipboardList} label="Total quizzes" value={quizzes.length} />
        <StatsCard icon={TrendingUp} label="Total attempts" value={totalAttempts} />
        <StatsCard icon={Users} label="Unique students" value={totalStudents} />
        <StatsCard icon={Trophy} label="Avg. score" value={`${overallAvg}%`} />
      </div>

      {isLoading ? (
        <DashboardSkeleton count={3} />
      ) : quizzes.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No quizzes yet"
          description="Create a quiz on one of your courses to start collecting analytics."
        />
      ) : (
        <div className="space-y-3">
          {quizzes.map((q) => (
            <Card key={q.id} className="border-border/50 bg-card">
              <CardContent className="space-y-3 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-lg font-semibold">{q.title}</h3>
                      <Badge variant="outline">Pass {q.passing_score}%</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{q.course_title}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{q.attempts} attempts</span>
                    <span>•</span>
                    <span>{q.uniqueStudents} students</span>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Average score</span>
                      <span className="font-medium">{q.averageScore}%</span>
                    </div>
                    <Progress value={q.averageScore} className="h-2" />
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Pass rate</span>
                      <span className="font-medium">{q.passRate}%</span>
                    </div>
                    <Progress value={q.passRate} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
