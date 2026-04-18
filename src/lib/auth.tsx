import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "student" | "instructor" | "admin";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  loading: boolean;
  hasRole: (role: AppRole) => boolean;
  primaryRole: AppRole | null;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchRoles(userId: string): Promise<AppRole[]> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error || !data) return [];
  return data.map((r) => r.role as AppRole);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    // 1. Set up listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!active) return;

      setLoading(true);
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        // defer to avoid recursion warning
        setTimeout(() => {
          fetchRoles(newSession.user.id)
            .then((nextRoles) => {
              if (!active) return;
              setRoles(nextRoles);
            })
            .finally(() => {
              if (!active) return;
              setLoading(false);
            });
        }, 0);
      } else {
        setRoles([]);
        setLoading(false);
      }
    });

    // 2. THEN check existing session
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;

      setSession(data.session);
      setUser(data.session?.user ?? null);

      if (data.session?.user) {
        fetchRoles(data.session.user.id)
          .then((r) => {
            if (!active) return;
            setRoles(r);
          })
          .finally(() => {
            if (!active) return;
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const hasRole = (role: AppRole) => roles.includes(role);
  const primaryRole: AppRole | null = roles.includes("admin")
    ? "admin"
    : roles.includes("instructor")
      ? "instructor"
      : roles.includes("student")
        ? "student"
        : null;

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshRoles = async () => {
    if (user) setRoles(await fetchRoles(user.id));
  };

  return (
    <AuthContext.Provider value={{ user, session, roles, loading, hasRole, primaryRole, signOut, refreshRoles }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
