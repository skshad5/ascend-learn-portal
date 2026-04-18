import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { ChevronLeft, CheckCircle2, XCircle, Loader2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/student/quiz/$quizId")({
  component: QuizPage,
});

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  order_index: number;
  // correct_index intentionally omitted from UI fetch (RLS allows it but we don't render it)
}

function QuizPage() {
  const { quizId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [submitted, setSubmitted] = useState<{
    score: number;
    passed: boolean;
    correctById: Record<string, number>;
  } | null>(null);

  const { data: quiz, isLoading: quizLoading } = useQuery({
    queryKey: ["quiz", quizId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quizzes")
        .select("id, title, passing_score, course_id")
        .eq("id", quizId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: questions, isLoading: qLoading } = useQuery({
    queryKey: ["quiz-questions", quizId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quiz_questions")
        .select("id, question, options, order_index, correct_index")
        .eq("quiz_id", quizId)
        .order("order_index");
      if (error) throw error;
      return (data ?? []).map((q) => ({
        ...q,
        options: Array.isArray(q.options) ? (q.options as string[]) : [],
      }));
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      if (!questions || questions.length === 0) throw new Error("No questions");
      let correct = 0;
      const correctById: Record<string, number> = {};
      for (const q of questions) {
        correctById[q.id] = q.correct_index;
        if (answers[q.id] === q.correct_index) correct++;
      }
      const score = Math.round((correct / questions.length) * 100);
      const { error } = await supabase.from("quiz_attempts").insert({
        user_id: user.id,
        quiz_id: quizId,
        score,
        answers,
      });
      if (error) throw error;
      return { score, correctById };
    },
    onSuccess: ({ score, correctById }) => {
      const passed = score >= (quiz?.passing_score ?? 70);
      setSubmitted({ score, passed, correctById });
      qc.invalidateQueries({ queryKey: ["quiz-attempts", quizId] });
      if (passed) toast.success(`Passed with ${score}%`);
      else toast.error(`Scored ${score}% — try again`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalQ = questions?.length ?? 0;
  const answeredCount = useMemo(
    () => (questions ?? []).filter((q) => answers[q.id] !== undefined).length,
    [questions, answers],
  );
  const allAnswered = totalQ > 0 && answeredCount === totalQ;
  const progress = totalQ > 0 ? (answeredCount / totalQ) * 100 : 0;
  const currentQ = questions?.[currentIdx];

  if (quizLoading || qLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading quiz...
      </div>
    );
  }

  if (!quiz || totalQ === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <h1 className="font-display text-2xl font-bold">Quiz not available</h1>
        <p className="mt-2 text-muted-foreground">This quiz has no questions yet.</p>
        <Button asChild variant="outline" className="mt-6">
          <Link to="/student/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  // Results view
  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Card className="border-border/50 bg-card">
          <CardContent className="space-y-6 p-8 text-center">
            <div
              className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${
                submitted.passed ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
              }`}
            >
              {submitted.passed ? (
                <Trophy className="h-10 w-10" />
              ) : (
                <XCircle className="h-10 w-10" />
              )}
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold">
                {submitted.passed ? "You passed!" : "Not quite"}
              </h1>
              <p className="mt-2 text-muted-foreground">
                {quiz.title} • Passing score {quiz.passing_score}%
              </p>
            </div>
            <div className="text-5xl font-bold tracking-tight text-gradient-primary">
              {submitted.score}%
            </div>
            <div className="mt-4 space-y-3 text-left">
              {questions!.map((q, i) => {
                const userAns = answers[q.id];
                const correct = submitted.correctById[q.id];
                const isCorrect = userAns === correct;
                return (
                  <div
                    key={q.id}
                    className="rounded-lg border border-border/50 bg-muted/20 p-4"
                  >
                    <div className="flex items-start gap-2">
                      {isCorrect ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      ) : (
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {i + 1}. {q.question}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Your answer:{" "}
                          <span className={isCorrect ? "text-success" : "text-destructive"}>
                            {userAns !== undefined ? q.options[userAns] : "—"}
                          </span>
                        </p>
                        {!isCorrect && (
                          <p className="text-xs text-muted-foreground">
                            Correct:{" "}
                            <span className="text-success">{q.options[correct]}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSubmitted(null);
                  setAnswers({});
                  setCurrentIdx(0);
                }}
              >
                Retake quiz
              </Button>
              <Button
                className="bg-gradient-primary"
                onClick={() =>
                  navigate({ to: "/courses/$courseId", params: { courseId: quiz.course_id } })
                }
              >
                Back to course
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Taking view
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/60 bg-card/40">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/student/dashboard">
              <ChevronLeft className="mr-1 h-4 w-4" />
              Exit
            </Link>
          </Button>
          <div className="font-display text-sm font-semibold">{quiz.title}</div>
          <div className="text-xs text-muted-foreground">
            {answeredCount}/{totalQ} answered
          </div>
        </div>
        <div className="mx-auto max-w-3xl px-4 pb-3">
          <Progress value={progress} className="h-1.5" />
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8">
        <Card className="border-border/50 bg-card">
          <CardContent className="space-y-6 p-6 sm:p-8">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Question {currentIdx + 1} of {totalQ}
            </div>
            <h2 className="font-display text-xl font-semibold leading-snug">
              {currentQ!.question}
            </h2>
            <div className="space-y-2">
              {currentQ!.options.map((opt, i) => {
                const selected = answers[currentQ!.id] === i;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setAnswers((p) => ({ ...p, [currentQ!.id]: i }))}
                    className={`w-full rounded-lg border p-4 text-left text-sm transition-all ${
                      selected
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border bg-background hover:border-primary/50 hover:bg-muted/30"
                    }`}
                  >
                    <span className="mr-3 inline-flex h-6 w-6 items-center justify-center rounded-full border border-border text-xs font-medium">
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              <Button
                variant="outline"
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
              >
                Previous
              </Button>
              {currentIdx < totalQ - 1 ? (
                <Button
                  className="bg-gradient-primary"
                  onClick={() => setCurrentIdx((i) => Math.min(totalQ - 1, i + 1))}
                >
                  Next
                </Button>
              ) : (
                <Button
                  className="bg-gradient-primary"
                  disabled={!allAnswered || submit.isPending}
                  onClick={() => submit.mutate()}
                >
                  {submit.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit quiz"
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Question navigator */}
        <div className="mt-6 flex flex-wrap gap-2">
          {questions!.map((q, i) => {
            const answered = answers[q.id] !== undefined;
            const active = i === currentIdx;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setCurrentIdx(i)}
                className={`flex h-9 w-9 items-center justify-center rounded-lg border text-xs font-medium transition-colors ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : answered
                      ? "border-primary/40 bg-primary/10 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-muted"
                }`}
                aria-label={`Go to question ${i + 1}`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
