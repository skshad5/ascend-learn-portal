import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CourseCardData } from "@/components/CourseCard";

export const COURSES_PAGE_SIZE = 12;

export const categoriesQueryOptions = () =>
  queryOptions({
    queryKey: ["categories"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

export const homeCategoriesQueryOptions = () =>
  queryOptions({
    queryKey: ["home-categories"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, icon")
        .limit(6);
      if (error) throw error;
      return data;
    },
  });

export const featuredCoursesQueryOptions = () =>
  queryOptions({
    queryKey: ["featured-courses"],
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select(
          "id, title, slug, description, thumbnail, level, is_free, price, category:categories(name)",
        )
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data as unknown as CourseCardData[];
    },
  });

export interface CoursesListParams {
  page: number;
  pageSize: number;
  level?: string;
  price?: string;
  categoryId?: string;
  q?: string;
}

export const coursesListQueryOptions = (params: CoursesListParams) =>
  queryOptions({
    queryKey: ["courses-list", params],
    staleTime: 30_000,
    queryFn: async () => {
      const from = (params.page - 1) * params.pageSize;
      const to = from + params.pageSize - 1;

      let query = supabase
        .from("courses")
        .select(
          "id, title, slug, description, thumbnail, level, is_free, price, category:categories(name, slug)",
          { count: "exact" },
        )
        .eq("status", "approved");

      if (params.level) query = query.eq("level", params.level);
      if (params.price === "free") query = query.eq("is_free", true);
      if (params.price === "paid") query = query.eq("is_free", false);
      if (params.categoryId) query = query.eq("category_id", params.categoryId);
      if (params.q) query = query.ilike("title", `%${params.q}%`);

      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return {
        items: (data ?? []) as unknown as (CourseCardData & {
          category?: { name: string; slug: string } | null;
        })[],
        total: count ?? 0,
      };
    },
  });

export const studentEnrollmentsQueryOptions = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["my-enrollments", userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      if (!userId) return [];
      const { data: enr, error } = await supabase
        .from("enrollments")
        .select(
          "course_id, enrolled_at, course:courses(id, title, thumbnail, description, lessons(id))",
        )
        .eq("user_id", userId);
      if (error) throw error;

      const allLessonIds = (enr ?? []).flatMap(
        (e) =>
          ((e.course as { lessons?: { id: string }[] } | null)?.lessons ?? []).map(
            (l) => l.id,
          ),
      );

      let completedSet = new Set<string>();
      if (allLessonIds.length > 0) {
        const { data: progress } = await supabase
          .from("lesson_progress")
          .select("lesson_id")
          .eq("user_id", userId)
          .eq("completed", true)
          .in("lesson_id", allLessonIds);
        completedSet = new Set((progress ?? []).map((p) => p.lesson_id));
      }

      return (enr ?? []).map((e) => {
        const lessons =
          (e.course as { lessons?: { id: string }[] } | null)?.lessons ?? [];
        const completed = lessons.filter((l) => completedSet.has(l.id)).length;
        return {
          ...e,
          total: lessons.length,
          completed,
          firstLessonId: lessons[0]?.id ?? null,
        };
      });
    },
  });
