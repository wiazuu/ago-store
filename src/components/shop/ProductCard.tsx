import { Link } from "@tanstack/react-router";
import type { Product } from "@/data/types";
import { brl, priceOf } from "@/lib/format";
import { useShopStore } from "@/store/shop-store";
import { Button } from "@/components/ui/button";
import { ShoppingBag } from "lucide-react";

const BADGE_MAP: Record<string, { label: string; className: string }> = {
  "mais-vendido": { label: "Mais vendido", className: "bg-primary text-primary-foreground" },
  novo: { label: "Novo", className: "bg-secondary text-secondary-foreground" },
  promo: { label: "Promoção", className: "bg-destructive text-destructive-foreground" },
  chef: { label: "Do chef", className: "bg-charcoal text-cream" },
  fit: { label: "Fit", className: "bg-success text-cream" },
};

export function ProductCard({ p }: { p: Product }) {
  const add = useShopStore((s) => s.add);
  const badge = p.badge && BADGE_MAP[p.badge];
  const finalPrice = priceOf(p);

  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card brand-shadow transition-all duration-300 hover:-translate-y-1 hover:brand-shadow-lg sm:rounded-3xl">
      <Link
        to="/produto/$slug"
        params={{ slug: p.slug }}
        className="relative block aspect-square overflow-hidden bg-muted"
      >
        <img
          src={p.image}
          alt={p.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        {badge && (
          <span
            className={`absolute left-2 top-2 rounded-full px-2 py-1 text-[9px] font-bold sm:left-3 sm:top-3 sm:px-3 sm:text-xs ${badge.className}`}
          >
            {badge.label}
          </span>
        )}
        {p.promoPrice && p.promoPrice < p.price && (
          <span className="absolute right-2 top-2 rounded-full bg-destructive px-2 py-1 text-[9px] font-bold text-destructive-foreground sm:right-3 sm:top-3 sm:px-2.5 sm:text-xs">
            -{Math.round((1 - p.promoPrice / p.price) * 100)}%
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-5">
        <div className="flex flex-wrap gap-1">
          {p.tags.slice(0, 1).map((t) => (
            <span
              key={t}
              className="max-w-full truncate rounded-full bg-muted px-2 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground sm:text-[10px]"
            >
              {t}
            </span>
          ))}
        </div>
        <Link
          to="/produto/$slug"
          params={{ slug: p.slug }}
          className="line-clamp-2 font-display text-base leading-tight text-foreground transition hover:text-primary sm:text-lg"
        >
          {p.name}
        </Link>
        <p className="hidden flex-1 text-sm text-muted-foreground sm:line-clamp-2">
          {p.shortDescription}
        </p>

        <div className="grid grid-cols-3 gap-1 pt-1 text-center text-[9px] font-semibold text-muted-foreground sm:text-xs">
          <span className="rounded-lg bg-muted px-1 py-1.5">{p.weightG}g</span>
          <span className="rounded-lg bg-muted px-1 py-1.5">{p.calories} kcal</span>
          <span className="rounded-lg bg-muted px-1 py-1.5">{p.protein}g prot.</span>
        </div>

        <div className="mt-auto flex flex-col items-stretch gap-2 pt-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col">
            {p.promoPrice && p.promoPrice < p.price && (
              <span className="text-xs text-muted-foreground line-through">{brl(p.price)}</span>
            )}
            <span className="font-display text-lg text-foreground sm:text-xl">
              {brl(finalPrice)}
            </span>
          </div>
          <Button
            size="sm"
            className="w-full px-2 sm:w-auto sm:px-3"
            disabled={p.stock <= 0}
            onClick={() =>
              add({ productId: p.id, name: p.name, image: p.image, price: finalPrice })
            }
          >
            <ShoppingBag className="w-4 h-4" />
            {p.stock > 0 ? "Adicionar" : "Esgotado"}
          </Button>
        </div>
      </div>
    </article>
  );
}
