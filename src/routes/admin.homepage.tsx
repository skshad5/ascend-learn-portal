import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ThumbnailUpload } from "@/components/ThumbnailUpload";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Star } from "lucide-react";

export const Route = createFileRoute("/admin/homepage")({
  component: AdminHomepagePage,
});

function AdminHomepagePage() {
  const qc = useQueryClient();
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [heroCtaText, setHeroCtaText] = useState("");
  const [heroCtaLink, setHeroCtaLink] = useState("");
  const [bannerImage, setBannerImage] = useState("");
  const [featured, setFeatured] = useState<string[]>([]);

  const { data: content } = useQuery({
    queryKey: ["homepage-content"],
    queryFn: async () => {
      const { data } = await supabase
        .from("homepage_content")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: courses } = useQuery({
    queryKey: ["admin-homepage-course-options"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, title, status, thumbnail")
        .eq("status", "approved")
        .order("title");
      return data ?? [];
    },
  });

  useEffect(() => {
    if (content) {
      setHeroTitle(content.hero_title ?? "");
      setHeroSubtitle(content.hero_subtitle ?? "");
      setHeroCtaText(content.hero_cta_text ?? "");
      setHeroCtaLink(content.hero_cta_link ?? "");
      setBannerImage(content.banner_image ?? "");
      setFeatured(content.featured_course_ids ?? []);
    }
  }, [content]);

  const save = useMutation({
    mutationFn: async () => {
      if (!content) throw new Error("Homepage content row missing");
      const { error } = await supabase
        .from("homepage_content")
        .update({
          hero_title: heroTitle.trim(),
          hero_subtitle: heroSubtitle.trim(),
          hero_cta_text: heroCtaText.trim(),
          hero_cta_link: heroCtaLink.trim() || "/courses",
          banner_image: bannerImage.trim() || null,
          featured_course_ids: featured,
        })
        .eq("id", content.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Homepage saved");
      qc.invalidateQueries({ queryKey: ["homepage-content"] });
      qc.invalidateQueries({ queryKey: ["featured-courses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleFeatured = (id: string) => {
    setFeatured((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Homepage CMS</h1>
          <p className="mt-1 text-muted-foreground">
            Edit the hero, banner and featured courses shown on the public homepage.
          </p>
        </div>
        <Button
          onClick={() => save.mutate()}
          disabled={save.isPending || !content}
          className="bg-gradient-primary"
        >
          <Save className="mr-2 h-4 w-4" />
          {save.isPending ? "Saving..." : "Save changes"}
        </Button>
      </div>

      <Card className="border-border/50 bg-card">
        <CardContent className="space-y-4 p-6">
          <h2 className="font-display text-lg font-semibold">Hero section</h2>
          <div className="space-y-2">
            <Label htmlFor="hero-title">Title</Label>
            <Input
              id="hero-title"
              value={heroTitle}
              maxLength={120}
              onChange={(e) => setHeroTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hero-subtitle">Subtitle</Label>
            <Textarea
              id="hero-subtitle"
              rows={3}
              maxLength={300}
              value={heroSubtitle}
              onChange={(e) => setHeroSubtitle(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cta-text">CTA button text</Label>
              <Input
                id="cta-text"
                value={heroCtaText}
                maxLength={40}
                onChange={(e) => setHeroCtaText(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cta-link">CTA link</Label>
              <Input
                id="cta-link"
                value={heroCtaLink}
                maxLength={200}
                onChange={(e) => setHeroCtaLink(e.target.value)}
                placeholder="/courses"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card">
        <CardContent className="space-y-4 p-6">
          <h2 className="font-display text-lg font-semibold">Banner image</h2>
          <p className="text-sm text-muted-foreground">
            Optional banner shown above the hero. Leave empty to hide.
          </p>
          <ThumbnailUpload value={bannerImage} onChange={setBannerImage} />
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card">
        <CardContent className="space-y-4 p-6">
          <div>
            <h2 className="font-display text-lg font-semibold">Featured courses</h2>
            <p className="text-sm text-muted-foreground">
              Pick up to 6. If none selected, the homepage shows the latest approved courses.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {courses?.map((c) => {
              const checked = featured.includes(c.id);
              return (
                <label
                  key={c.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/50 bg-background p-3 transition hover:border-primary/40"
                >
                  <Checkbox checked={checked} onCheckedChange={() => toggleFeatured(c.id)} />
                  <div className="h-10 w-14 flex-shrink-0 overflow-hidden rounded bg-gradient-primary">
                    {c.thumbnail && (
                      <img src={c.thumbnail} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 truncate text-sm">{c.title}</div>
                  {checked && <Star className="h-4 w-4 text-primary-glow" />}
                </label>
              );
            })}
          </div>
          {featured.length > 6 && (
            <p className="text-xs text-destructive">
              You have selected {featured.length}; only the first 6 will be shown.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
