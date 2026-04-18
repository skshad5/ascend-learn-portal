import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar, type DashboardNavItem } from "@/components/DashboardSidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { LayoutDashboard, BookOpen, PlusCircle, LogOut } from "lucide-react";

const items: DashboardNavItem[] = [
  { title: "Dashboard", path: "/instructor/dashboard", icon: LayoutDashboard },
  { title: "My Courses", path: "/instructor/courses", icon: BookOpen },
  { title: "New Course", path: "/instructor/courses/new", icon: PlusCircle },
];

export const Route = createFileRoute("/instructor")({
  component: InstructorLayout,
});

function InstructorLayout() {
  const { user, loading, hasRole, signOut } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (!hasRole("instructor") && !hasRole("admin")) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6 text-center">
        <div>
          <h1 className="font-display text-2xl font-bold">Instructor access required</h1>
          <p className="mt-2 text-muted-foreground">Your account doesn't have instructor privileges.</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <DashboardSidebar items={items} label="Instructor" />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <span className="font-display font-semibold">Instructor dashboard</span>
            </div>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />Sign out
            </Button>
          </header>
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
