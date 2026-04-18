import { Link } from "@tanstack/react-router";
import { GraduationCap, LogOut, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { useProfile, getInitials } from "@/hooks/use-profile";

export function PublicHeader() {
  const { user, primaryRole, signOut } = useAuth();
  const { data: profile } = useProfile();
  const displayName = profile?.full_name || user?.email || "";
  const initials = getInitials(profile?.full_name || user?.email);

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
                <Link to={dashboardPath}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
              <Link
                to="/student/profile"
                className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 transition-colors hover:bg-muted"
                title={displayName}
              >
                <Avatar className="h-7 w-7">
                  {profile?.avatar_url ? (
                    <AvatarImage src={profile.avatar_url} alt={displayName} />
                  ) : null}
                  <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                </Avatar>
                <span className="hidden max-w-[140px] truncate text-sm font-medium sm:inline">
                  {displayName}
                </span>
              </Link>
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
