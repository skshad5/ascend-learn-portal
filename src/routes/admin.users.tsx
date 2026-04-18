import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { AppRole } from "@/lib/auth";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const qc = useQueryClient();

  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, created_at").order("created_at", { ascending: false });
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      return (profiles ?? []).map((p) => ({
        ...p,
        roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role as AppRole),
      }));
    },
  });

  const toggleRole = useMutation({
    mutationFn: async ({ userId, role, has }: { userId: string; role: AppRole; has: boolean }) => {
      if (has) {
        const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Role updated");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Users</h1>
      <div className="grid gap-3">
        {users?.map((u) => (
          <Card key={u.id} className="border-border/50 bg-card">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-medium">{u.full_name ?? "Anonymous"}</div>
                <div className="text-xs text-muted-foreground">
                  Joined {new Date(u.created_at).toLocaleDateString()}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {u.roles.map((r) => <Badge key={r} variant="secondary">{r}</Badge>)}
                  {u.roles.length === 0 && <span className="text-xs text-muted-foreground">No roles</span>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["student", "instructor", "admin"] as AppRole[]).map((role) => {
                  const has = u.roles.includes(role);
                  return (
                    <Button
                      key={role}
                      size="sm"
                      variant={has ? "default" : "outline"}
                      onClick={() => toggleRole.mutate({ userId: u.id, role, has })}
                      className={has ? "bg-gradient-primary" : ""}
                    >
                      {has ? "Remove " : "Grant "}{role}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
