import { Link, useLocation } from "@tanstack/react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GraduationCap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useProfile, getInitials } from "@/hooks/use-profile";

export interface DashboardNavItem {
  title: string;
  path: string;
  icon: LucideIcon;
}

export function DashboardSidebar({ items, label }: { items: DashboardNavItem[]; label: string }) {
  const location = useLocation();
  const currentPath = location.pathname;
  const { user, primaryRole } = useAuth();
  const { data: profile } = useProfile();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const displayName = profile?.full_name || user?.email || "Account";
  const initials = getInitials(profile?.full_name || user?.email);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="flex items-center gap-2 px-3 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
            <GraduationCap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-base font-bold">Lumen</span>
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>{label}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active =
                  currentPath === item.path ||
                  (item.path !== "/" && currentPath.startsWith(item.path));
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link to={item.path}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {user && (
        <SidebarFooter>
          <Link
            to="/student/profile"
            className="flex items-center gap-2 rounded-md p-2 transition-colors hover:bg-sidebar-accent"
          >
            <Avatar className="h-8 w-8 shrink-0">
              {profile?.avatar_url ? (
                <AvatarImage src={profile.avatar_url} alt={displayName} />
              ) : null}
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">{displayName}</span>
                {primaryRole && (
                  <span className="truncate text-xs capitalize text-muted-foreground">
                    {primaryRole}
                  </span>
                )}
              </div>
            )}
          </Link>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
