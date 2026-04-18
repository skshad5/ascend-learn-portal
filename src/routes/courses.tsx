import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { CourseCard } from "@/components/CourseCard";
import { CourseCardGridSkeleton } from "@/components/skeletons";
import { EmptyState } from "@/components/EmptyState";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  COURSES_PAGE_SIZE,
  categoriesQueryOptions,
  coursesListQueryOptions,
} from "@/lib/queries";

export const Route = createFileRoute("/courses")({
  validateSearch: (search: Record<string, unknown>) => ({
    category: typeof search.category === "string" ? search.category : undefined,
    level: typeof search.level === "string" ? search.level : undefined,
    price: typeof search.price === "string" ? search.price : undefined,
    q: typeof search.q === "string" ? search.q : undefined,
    page: typeof search.page === "number" && search.page > 0 ? search.page : 1,
    pageSize:
      typeof search.pageSize === "number" && search.pageSize > 0
        ? search.pageSize
        : COURSES_PAGE_SIZE,
  }),
  head: () => ({
    meta: [
      { title: "Browse courses — Lumen LMS" },
      { name: "description", content: "Search and discover courses across categories, levels and price tiers." },
      { property: "og:title", content: "Browse courses — Lumen LMS" },
      { property: "og:description", content: "Search and discover courses across categories, levels and price tiers." },
    ],
  }),
  loader: ({ context: { queryClient } }) => {
    // Always preload categories for the filter dropdown
    queryClient.prefetchQuery(categoriesQueryOptions());
  },
  component: CoursesPage,
});

function CoursesPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [q, setQ] = useState(search.q ?? "");
  const [debouncedQ, setDebouncedQ] = useState(search.q ?? "");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  // When debounced q changes, push to URL & reset to page 1
  useEffect(() => {
    if ((debouncedQ || "") !== (search.q || "")) {
      navigate({
        search: { ...search, q: debouncedQ || undefined, page: 1 },
        replace: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ]);

  const { data: categories } = useQuery(categoriesQueryOptions());

  const categoryId = useMemo(
    () =>
      search.category
        ? categories?.find((c) => c.slug === search.category)?.id
        : undefined,
    [search.category, categories],
  );

  const { data, isLoading, isFetching } = useQuery(
    coursesListQueryOptions({
      page: search.page,
      pageSize: search.pageSize,
      level: search.level,
      price: search.price,
      categoryId,
      q: debouncedQ || undefined,
    }),
  );

  const updateSearch = (patch: Partial<typeof search>) => {
    navigate({ search: { ...search, ...patch, page: 1 } });
  };

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / search.pageSize));

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">All courses</h1>
        <p className="mt-2 text-muted-foreground">Find the right course for you.</p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search courses..." className="pl-9" />
          </div>
          <Select value={search.category ?? "all"} onValueChange={(v) => updateSearch({ category: v === "all" ? undefined : v })}>
            <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories?.map((c) => <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={search.level ?? "all"} onValueChange={(v) => updateSearch({ level: v === "all" ? undefined : v })}>
            <SelectTrigger className="w-full sm:w-[140px]"><SelectValue placeholder="Level" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
          <Select value={search.price ?? "all"} onValueChange={(v) => updateSearch({ price: v === "all" ? undefined : v })}>
            <SelectTrigger className="w-full sm:w-[120px]"><SelectValue placeholder="Price" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any price</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-8">
          {isLoading ? (
            <CourseCardGridSkeleton count={search.pageSize} />
          ) : data && data.items.length > 0 ? (
            <>
              <div className={`grid gap-6 sm:grid-cols-2 lg:grid-cols-3 ${isFetching ? "opacity-70 transition-opacity" : ""}`}>
                {data.items.map((c) => <CourseCard key={c.id} course={c} />)}
              </div>

              <div className="mt-10 flex flex-col items-center justify-between gap-4 sm:flex-row">
                <div className="text-sm text-muted-foreground">
                  Showing {(search.page - 1) * search.pageSize + 1}–
                  {Math.min(search.page * search.pageSize, total)} of {total}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={search.page <= 1}
                    onClick={() => navigate({ search: { ...search, page: search.page - 1 } })}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {search.page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={search.page >= totalPages}
                    onClick={() => navigate({ search: { ...search, page: search.page + 1 } })}
                  >
                    Next <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              title="No courses found"
              description="Try adjusting your filters or come back later."
              action={<Link to="/courses" className="text-primary-glow hover:underline">Clear filters</Link>}
            />
          )}
        </div>
      </div>
    </div>
  );
}
