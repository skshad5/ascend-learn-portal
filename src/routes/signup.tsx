import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create account — Lumen LMS" },
      { name: "description", content: "Sign up as a student or instructor on Lumen LMS." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "instructor">("student");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: fullName, role },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created! You're signed in.");
    navigate({ to: "/" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero px-4 py-12">
      <Card className="w-full max-w-md border-border/50 bg-card/80 shadow-elegant backdrop-blur">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <GraduationCap className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="font-display text-2xl">Create your account</CardTitle>
          <p className="text-sm text-muted-foreground">Start learning or teaching today</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password (min. 6 characters)</Label>
              <Input id="password" type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>I want to join as</Label>
              <RadioGroup value={role} onValueChange={(v) => setRole(v as "student" | "instructor")} className="grid grid-cols-2 gap-3">
                <label className={`cursor-pointer rounded-lg border p-3 text-center text-sm transition-colors ${role === "student" ? "border-primary bg-primary/10" : "border-border"}`}>
                  <RadioGroupItem value="student" className="sr-only" />
                  <div className="font-medium">Student</div>
                  <div className="text-xs text-muted-foreground">Learn courses</div>
                </label>
                <label className={`cursor-pointer rounded-lg border p-3 text-center text-sm transition-colors ${role === "instructor" ? "border-primary bg-primary/10" : "border-border"}`}>
                  <RadioGroupItem value="instructor" className="sr-only" />
                  <div className="font-medium">Instructor</div>
                  <div className="text-xs text-muted-foreground">Teach courses</div>
                </label>
              </RadioGroup>
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-gradient-primary shadow-glow">
              {loading ? "Creating..." : "Create account"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account? <Link to="/login" className="text-primary-glow hover:underline">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
