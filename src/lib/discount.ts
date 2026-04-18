export interface DiscountRow {
  id: string;
  course_id: string;
  discount_type: "percent" | "fixed";
  value: number;
  start_date: string | null;
  end_date: string | null;
  active: boolean;
}

export function getActiveDiscount(
  discounts: DiscountRow[] | undefined | null,
  now: Date = new Date(),
): DiscountRow | null {
  if (!discounts?.length) return null;
  const t = now.getTime();
  const valid = discounts.filter((d) => {
    if (!d.active) return false;
    if (d.start_date && new Date(d.start_date).getTime() > t) return false;
    if (d.end_date && new Date(d.end_date).getTime() < t) return false;
    return true;
  });
  if (!valid.length) return null;
  // Pick the one with the largest absolute discount on a $100 reference
  return valid.reduce((best, d) => {
    const bestAmt = best.discount_type === "percent" ? best.value : (best.value / 100) * 100;
    const dAmt = d.discount_type === "percent" ? d.value : (d.value / 100) * 100;
    return dAmt > bestAmt ? d : best;
  });
}

export function applyDiscount(price: number, discount: DiscountRow | null): number {
  if (!discount) return price;
  if (discount.discount_type === "percent") {
    return Math.max(0, price - (price * discount.value) / 100);
  }
  return Math.max(0, price - discount.value);
}

export function formatPrice(n: number): string {
  return `$${n.toFixed(2).replace(/\.00$/, "")}`;
}
