import { Link } from "@tanstack/react-router";
import { GraduationCap, LogOut, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export function PublicHeader() {
  const { user, primaryRole, signOut } = useAuth();

  const dashboardPath =
    primaryRole === "admin"
      ? "/admin/dashboard"
      : primaryRole === "instructor"
        ? "/instructor/dashboard"
        : "/student/dashboard";

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">Lumen LMS</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          <Link to="/" activeOptions={{ exact: true }} className="text-muted-foreground hover:text-foreground" activeProps={{ className: "text-foreground" }}>
            Home
          </Link>
          <Link to="/courses" className="text-muted-foreground hover:text-foreground" activeProps={{ className: "text-foreground" }}>
            Courses
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button asChild variant="ghost" size="sm">
                {/* @ts-expect-error dynamic dashboard path */}
                <Link to={dashboardPath}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="bg-gradient-primary shadow-glow">
                <Link to="/signup">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
