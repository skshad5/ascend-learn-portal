import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/instructor/courses/$id/quizzes")({
  component: QuizBuilderPage,
});

function QuizBuilderPage() {
  const { id: courseId } = Route.useParams();
  const qc = useQueryClient();
  const [quizTitle, setQuizTitle] = useState("");
  const [passingScore, setPassingScore] = useState("70");
  const [activeQuiz, setActiveQuiz] = useState<string | null>(null);

  const [question, setQuestion] = useState("");
  const [opt1, setOpt1] = useState(""); const [opt2, setOpt2] = useState("");
  const [opt3, setOpt3] = useState(""); const [opt4, setOpt4] = useState("");
  const [correct, setCorrect] = useState("0");

  const { data: quizzes } = useQuery({
    queryKey: ["builder-quizzes", courseId],
    queryFn: async () => (await supabase.from("quizzes").select("*").eq("course_id", courseId)).data ?? [],
  });

  const { data: questions } = useQuery({
    queryKey: ["builder-questions", activeQuiz],
    enabled: !!activeQuiz,
    queryFn: async () => (await supabase.from("quiz_questions").select("*").eq("quiz_id", activeQuiz!).order("order_index")).data ?? [],
  });

  const createQuiz = useMutation({
    mutationFn: async () => {
      const { error, data } = await supabase.from("quizzes").insert({ course_id: courseId, title: quizTitle, passing_score: Number(passingScore) }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (q) => {
      toast.success("Quiz created"); setQuizTitle(""); setActiveQuiz(q.id);
      qc.invalidateQueries({ queryKey: ["builder-quizzes", courseId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addQuestion = useMutation({
    mutationFn: async () => {
      if (!activeQuiz) return;
      const opts = [opt1, opt2, opt3, opt4].filter(Boolean);
      const { error } = await supabase.from("quiz_questions").insert({
        quiz_id: activeQuiz,
        question,
        options: opts,
        correct_index: Number(correct),
        order_index: questions?.length ?? 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Question added");
      setQuestion(""); setOpt1(""); setOpt2(""); setOpt3(""); setOpt4(""); setCorrect("0");
      qc.invalidateQueries({ queryKey: ["builder-questions", activeQuiz] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeQ = useMutation({
    mutationFn: async (qid: string) => { await supabase.from("quiz_questions").delete().eq("id", qid); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["builder-questions", activeQuiz] }),
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Quizzes</h1>

      <Card className="border-border/50 bg-card">
        <CardContent className="space-y-4 p-6">
          <h2 className="font-display text-lg font-semibold">Create a quiz</h2>
          <form onSubmit={(e: FormEvent) => { e.preventDefault(); createQuiz.mutate(); }} className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <Input required placeholder="Quiz title" value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} />
            <Input type="number" min="0" max="100" placeholder="Passing %" value={passingScore} onChange={(e) => setPassingScore(e.target.value)} className="w-32" />
            <Button type="submit" className="bg-gradient-primary"><Plus className="mr-1 h-4 w-4" />Add</Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {quizzes?.map((q) => (
          <Card key={q.id} className="border-border/50 bg-card">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <div className="font-medium">{q.title}</div>
                <div className="text-xs text-muted-foreground">Pass: {q.passing_score}%</div>
              </div>
              <Button size="sm" variant={activeQuiz === q.id ? "default" : "outline"} onClick={() => setActiveQuiz(activeQuiz === q.id ? null : q.id)}>
                {activeQuiz === q.id ? "Editing" : "Edit questions"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {activeQuiz && (
        <Card className="border-primary/40 bg-card">
          <CardContent className="space-y-4 p-6">
            <h3 className="font-display text-lg font-semibold">Add question</h3>
            <form onSubmit={(e: FormEvent) => { e.preventDefault(); addQuestion.mutate(); }} className="space-y-3">
              <div className="space-y-2"><Label>Question</Label><Input required value={question} onChange={(e) => setQuestion(e.target.value)} /></div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input required placeholder="Option 1" value={opt1} onChange={(e) => setOpt1(e.target.value)} />
                <Input required placeholder="Option 2" value={opt2} onChange={(e) => setOpt2(e.target.value)} />
                <Input placeholder="Option 3 (optional)" value={opt3} onChange={(e) => setOpt3(e.target.value)} />
                <Input placeholder="Option 4 (optional)" value={opt4} onChange={(e) => setOpt4(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Correct answer</Label>
                <Select value={correct} onValueChange={setCorrect}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Option 1</SelectItem>
                    <SelectItem value="1">Option 2</SelectItem>
                    {opt3 && <SelectItem value="2">Option 3</SelectItem>}
                    {opt4 && <SelectItem value="3">Option 4</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="bg-gradient-primary"><Plus className="mr-1 h-4 w-4" />Add question</Button>
            </form>

            <div className="space-y-2 border-t border-border pt-4">
              <h4 className="text-sm font-semibold">Existing questions</h4>
              {questions?.map((q, i) => (
                <div key={q.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="text-sm">
                    <span className="font-medium">{i + 1}. {q.question}</span>
                    <div className="text-xs text-muted-foreground">Correct: option {q.correct_index + 1}</div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => removeQ.mutate(q.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
