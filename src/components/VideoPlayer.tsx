import { useMemo } from "react";

function getEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    // YouTube
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
    // Vimeo
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
    return null;
  } catch {
    return null;
  }
}

export function VideoPlayer({ url, type }: { url: string; type: "url" | "upload" }) {
  const embedUrl = useMemo(() => (type === "url" ? getEmbedUrl(url) : null), [url, type]);

  if (type === "upload") {
    return (
      <video
        src={url}
        controls
        className="aspect-video w-full rounded-xl bg-black shadow-elegant"
      />
    );
  }

  if (embedUrl) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-xl shadow-elegant">
        <iframe
          src={embedUrl}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Lesson video"
        />
      </div>
    );
  }

  return (
    <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-muted text-muted-foreground">
      Unsupported video URL
    </div>
  );
}
