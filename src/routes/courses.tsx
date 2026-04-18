import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { CourseCard, type CourseCardData } from "@/components/CourseCard";
import { EmptyState } from "@/components/EmptyState";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/courses")({
  validateSearch: (search: Record<string, unknown>) => ({
    category: typeof search.category === "string" ? search.category : undefined,
    level: typeof search.level === "string" ? search.level : undefined,
    price: typeof search.price === "string" ? search.price : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Browse courses — Lumen LMS" },
      { name: "description", content: "Search and discover courses across categories, levels and price tiers." },
      { property: "og:title", content: "Browse courses — Lumen LMS" },
      { property: "og:description", content: "Search and discover courses across categories, levels and price tiers." },
    ],
  }),
  component: CoursesPage,
});

function CoursesPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id, name, slug").order("name");
      if (error) throw error;
      return data;
    },
  });

  // Resolve category slug -> id once so we can filter at the DB level
  const categoryId = search.category
    ? categories?.find((c) => c.slug === search.category)?.id
    : undefined;

  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses", search.level, search.price, search.category, debouncedQ, categoryId],
    staleTime: 30_000,
    queryFn: async () => {
      let query = supabase
        .from("courses")
        .select("id, title, slug, description, thumbnail, level, is_free, price, category:categories(name, slug)")
        .eq("status", "approved")
        .limit(48);

      if (search.level) query = query.eq("level", search.level);
      if (search.price === "free") query = query.eq("is_free", true);
      if (search.price === "paid") query = query.eq("is_free", false);
      if (categoryId) query = query.eq("category_id", categoryId);
      if (debouncedQ) query = query.ilike("title", `%${debouncedQ}%`);

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as (CourseCardData & { category?: { name: string; slug: string } | null })[];
    },
  });

  const updateSearch = (patch: Partial<typeof search>) => {
    navigate({ search: { ...search, ...patch } });
  };

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
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-[4/3] animate-pulse rounded-xl bg-card/50" />
              ))}
            </div>
          ) : courses && courses.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((c) => <CourseCard key={c.id} course={c} />)}
            </div>
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
