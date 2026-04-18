import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Pencil, Plus, Trash2, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/discounts")({
  component: AdminDiscountsPage,
});

interface DiscountForm {
  course_id: string;
  discount_type: "percent" | "fixed";
  value: string;
  start_date: string;
  end_date: string;
  active: boolean;
}

const emptyForm: DiscountForm = {
  course_id: "",
  discount_type: "percent",
  value: "10",
  start_date: "",
  end_date: "",
  active: true,
};

function AdminDiscountsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DiscountForm>(emptyForm);

  const { data: discounts } = useQuery({
    queryKey: ["admin-discounts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("discounts")
        .select("*, course:courses(id, title, price, is_free)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: courses } = useQuery({
    queryKey: ["admin-discounts-course-options"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, title, price, is_free")
        .order("title");
      return data ?? [];
    },
  });

  const upsert = useMutation({
    mutationFn: async () => {
      if (!form.course_id) throw new Error("Pick a course");
      const value = Number(form.value);
      if (!Number.isFinite(value) || value < 0) throw new Error("Invalid value");
      if (form.discount_type === "percent" && value > 100)
        throw new Error("Percent must be 0-100");
      const payload = {
        course_id: form.course_id,
        discount_type: form.discount_type,
        value,
        start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
        end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
        active: form.active,
      };
      if (editingId) {
        const { error } = await supabase.from("discounts").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("discounts").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Discount updated" : "Discount created");
      setOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ["admin-discounts"] });
      qc.invalidateQueries({ queryKey: ["course-discounts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("discounts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Discount deleted");
      qc.invalidateQueries({ queryKey: ["admin-discounts"] });
      qc.invalidateQueries({ queryKey: ["course-discounts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  type DiscountRow = NonNullable<typeof discounts>[number];
  const openEdit = (d: DiscountRow) => {
    setEditingId(d.id);
    setForm({
      course_id: d.course_id,
      discount_type: d.discount_type as "percent" | "fixed",
      value: String(d.value),
      start_date: d.start_date ? d.start_date.slice(0, 10) : "",
      end_date: d.end_date ? d.end_date.slice(0, 10) : "",
      active: d.active,
    });
    setOpen(true);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    upsert.mutate();
  };

  const isExpired = (d: { end_date: string | null }) =>
    !!d.end_date && new Date(d.end_date).getTime() < Date.now();
  const isUpcoming = (d: { start_date: string | null }) =>
    !!d.start_date && new Date(d.start_date).getTime() > Date.now();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Discounts</h1>
          <p className="mt-1 text-muted-foreground">Apply percent or fixed-amount price cuts.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} className="bg-gradient-primary">
              <Plus className="mr-2 h-4 w-4" />New discount
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit discount" : "New discount"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Course</Label>
                <Select
                  value={form.course_id || undefined}
                  onValueChange={(v) => setForm((f) => ({ ...f, course_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.title} {c.is_free ? "(Free)" : `($${c.price})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={form.discount_type}
                    onValueChange={(v: "percent" | "fixed") =>
                      setForm((f) => ({ ...f, discount_type: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Percent (%)</SelectItem>
                      <SelectItem value="fixed">Fixed ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Value</Label>
                  <Input
                    type="number"
                    min="0"
                    max={form.discount_type === "percent" ? "100" : undefined}
                    step="0.01"
                    value={form.value}
                    onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Start date</Label>
                  <Input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End date</Label>
                  <Input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <div className="text-sm font-medium">Active</div>
                  <div className="text-xs text-muted-foreground">
                    Inactive discounts are never applied.
                  </div>
                </div>
                <Switch
                  checked={form.active}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={upsert.isPending} className="bg-gradient-primary">
                  {upsert.isPending ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {discounts?.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card/30 p-10 text-center text-muted-foreground">
            <Tag className="mx-auto mb-2 h-8 w-8 text-primary-glow/60" />
            No discounts yet.
          </div>
        )}
        {discounts?.map((d) => {
          const expired = isExpired(d);
          const upcoming = isUpcoming(d);
          return (
            <Card key={d.id} className="border-border/50 bg-card">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary-glow">
                    <Tag className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium">{d.course?.title ?? "(unknown course)"}</div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {d.discount_type === "percent" ? `${d.value}% off` : `$${d.value} off`}
                      </span>
                      {d.start_date && (
                        <span>• from {new Date(d.start_date).toLocaleDateString()}</span>
                      )}
                      {d.end_date && (
                        <span>• until {new Date(d.end_date).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!d.active ? (
                    <Badge variant="secondary">Inactive</Badge>
                  ) : expired ? (
                    <Badge variant="destructive">Expired</Badge>
                  ) : upcoming ? (
                    <Badge variant="secondary">Upcoming</Badge>
                  ) : (
                    <Badge className="bg-success text-success-foreground">Active</Badge>
                  )}
                  <Button size="sm" variant="outline" onClick={() => openEdit(d)}>
                    <Pencil className="mr-1 h-4 w-4" />Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("Delete this discount?")) remove.mutate(d.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
