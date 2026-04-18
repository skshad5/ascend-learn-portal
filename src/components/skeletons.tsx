import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

export function CourseCardSkeleton() {
  return (
    <Card className="h-full overflow-hidden border-border/50 bg-card">
      <Skeleton className="aspect-video w-full rounded-none" />
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="mt-2 h-5 w-2/3" />
      </CardHeader>
      <CardContent className="pb-3 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-20" />
      </CardFooter>
    </Card>
  );
}

export function CourseCardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <CourseCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function DashboardCardSkeleton() {
  return (
    <Card className="overflow-hidden border-border/50 bg-card">
      <Skeleton className="aspect-video w-full rounded-none" />
      <CardContent className="space-y-3 p-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-2 w-full" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-10" />
        </div>
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  );
}

export function DashboardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <DashboardCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function StatsCardSkeleton() {
  return (
    <Card className="border-border/50 bg-card">
      <CardContent className="p-6 space-y-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-16" />
      </CardContent>
    </Card>
  );
}

export function StatsRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <StatsCardSkeleton key={i} />
      ))}
    </div>
  );
}
