import { useRef, useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

interface ThumbnailUploadProps {
  value: string;
  onChange: (url: string) => void;
}

export function ThumbnailUpload({ value, onChange }: ThumbnailUploadProps) {
  const { user } = useAuth();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!user) {
      toast.error("You must be signed in to upload.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB.");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("course-thumbnails")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("course-thumbnails").getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Thumbnail uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>Thumbnail</Label>
      {value ? (
        <div className="relative overflow-hidden rounded-lg border border-border">
          <img src={value} alt="Course thumbnail" className="h-40 w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-2 top-2 rounded-full bg-background/80 p-1.5 shadow hover:bg-background"
            aria-label="Remove thumbnail"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/50 disabled:opacity-60"
        >
          {uploading ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <Upload className="h-6 w-6" />
              <span>Click to upload (max 5MB)</span>
            </>
          )}
        </button>
      )}
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      <div className="flex items-center gap-2">
        <Input
          type="url"
          placeholder="...or paste an image URL"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="text-xs"
        />
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
