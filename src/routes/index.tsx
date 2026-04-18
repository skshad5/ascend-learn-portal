import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Award, BookOpen, GraduationCap, PlayCircle, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/PublicHeader";
import { CourseCard } from "@/components/CourseCard";
import { CourseCardGridSkeleton } from "@/components/skeletons";
import {
  featuredCoursesQueryOptions,
  homeCategoriesQueryOptions,
  homepageContentQueryOptions,
} from "@/lib/queries";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lumen LMS — Learn anything, teach anyone" },
      { name: "description", content: "Modern dark-themed learning platform with courses, video lessons, quizzes and instructor tools." },
      { property: "og:title", content: "Lumen LMS — Learn anything, teach anyone" },
      { property: "og:description", content: "Modern dark-themed learning platform with courses, video lessons, quizzes and instructor tools." },
    ],
  }),
  loader: ({ context: { queryClient } }) => {
    queryClient.prefetchQuery(featuredCoursesQueryOptions());
    queryClient.prefetchQuery(homeCategoriesQueryOptions());
    queryClient.prefetchQuery(homepageContentQueryOptions());
  },
  component: LandingPage,
});

function LandingPage() {
  const { data: featured, isLoading: featuredLoading } = useQuery(featuredCoursesQueryOptions());
  const { data: categories } = useQuery(homeCategoriesQueryOptions());
  const { data: hp } = useQuery(homepageContentQueryOptions());

  const heroTitle = hp?.hero_title ?? "Learn anything. Teach anyone.";
  const heroSubtitle =
    hp?.hero_subtitle ??
    "A complete learning platform with rich video lessons, quizzes, progress tracking, and powerful instructor tools.";
  const ctaText = hp?.hero_cta_text ?? "Browse courses";
  const ctaLink = hp?.hero_cta_link ?? "/courses";
  const banner = hp?.banner_image;

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      {banner && (
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
          <div className="overflow-hidden rounded-2xl">
            <img src={banner} alt="" className="h-48 w-full object-cover sm:h-64" />
          </div>
        </div>
      )}

      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary-glow" />
              Built for modern learning
            </div>
            <h1 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              {heroTitle}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              {heroSubtitle}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-gradient-primary shadow-glow">
                <a href={ctaLink}>
                  {ctaText} <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/signup">Become an instructor</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border/50 bg-card/30">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-10 sm:grid-cols-4 sm:px-6">
          {[
            { icon: BookOpen, label: "Courses", value: "120+" },
            { icon: Users, label: "Learners", value: "10k+" },
            { icon: GraduationCap, label: "Instructors", value: "300+" },
            { icon: Award, label: "Certificates", value: "5k+" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <s.icon className="mx-auto mb-2 h-6 w-6 text-primary-glow" />
              <div className="font-display text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="font-display text-3xl font-bold">Browse categories</h2>
            <p className="mt-2 text-muted-foreground">Find your next learning path.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {categories?.map((cat) => (
            <Link
              key={cat.id}
              to="/courses"
              search={{ category: cat.slug }}
              className="group rounded-xl border border-border/50 bg-card p-4 text-center transition-all hover:border-primary/50 hover:shadow-glow"
            >
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary-glow group-hover:bg-gradient-primary group-hover:text-primary-foreground">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="text-sm font-medium">{cat.name}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured courses */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="font-display text-3xl font-bold">Featured courses</h2>
            <p className="mt-2 text-muted-foreground">Hand-picked, freshly published.</p>
          </div>
          <Button asChild variant="ghost">
            <Link to="/courses">
              View all <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        {featuredLoading ? (
          <CourseCardGridSkeleton count={6} />
        ) : featured && featured.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-card/30 p-12 text-center text-muted-foreground">
            <PlayCircle className="mx-auto mb-3 h-10 w-10 text-primary-glow/60" />
            No courses yet. Be the first instructor to publish!
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="overflow-hidden rounded-3xl bg-gradient-primary p-10 text-center shadow-glow sm:p-16">
          <h2 className="font-display text-3xl font-bold text-primary-foreground sm:text-4xl">
            Ready to start your journey?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-primary-foreground/90">
            Sign up free and get instant access to dozens of high-quality courses.
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-8">
            <Link to="/signup">Create your account</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border/50 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Lumen LMS. Crafted with care.
      </footer>
    </div>
  );
}
