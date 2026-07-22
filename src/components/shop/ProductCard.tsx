import { Link } from "@tanstack/react-router";
import type { Product } from "@/data/types";
import { useShopStore } from "@/store/shop-store";
import { Button } from "@/components/ui/button";
import { Heart, Layers3 } from "lucide-react";

const BADGE_MAP: Record<string, { label: string; className: string }> = {
  "mais-vendido": { label: "Mais vendido", className: "bg-primary text-primary-foreground" },
  novo: { label: "Novo", className: "bg-secondary text-secondary-foreground" },
  promo: { label: "Promoção", className: "bg-destructive text-destructive-foreground" },
  chef: { label: "Do chef", className: "bg-charcoal text-cream" },
  fit: { label: "Fit", className: "bg-success text-cream" },
};

export function ProductCard({ p }: { p: Product }) {
  const favorites = useShopStore((s) => s.favoriteIds);
  const setFavorites = useShopStore((s) => s.setFavorites);
  const badge = p.badge && BADGE_MAP[p.badge];

  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card brand-shadow transition-all duration-300 hover:-translate-y-1 hover:brand-shadow-lg sm:rounded-3xl">
      <div className="relative">
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
        <button
          type="button"
          aria-label={favorites.includes(p.id) ? "Remover dos favoritos" : "Salvar nos favoritos"}
          className="absolute bottom-3 right-3 grid h-10 w-10 place-items-center rounded-full bg-card/95 shadow"
          onClick={async () => {
            const response = await fetch("/api/customer-account", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "favorite", productId: p.id }),
            });
            if (response.status === 401) {
              window.location.assign("/login");
              return;
            }
            if (response.ok) {
              const result = (await response.json()) as { favorite: boolean };
              setFavorites(
                result.favorite
                  ? [...new Set([...favorites, p.id])]
                  : favorites.filter((id) => id !== p.id),
              );
            }
          }}
        >
          <Heart
            className={`h-5 w-5 ${favorites.includes(p.id) ? "fill-coral text-coral" : "text-charcoal"}`}
          />
        </button>
      </div>

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
          <span className="rounded-lg bg-muted px-1 py-1.5">{p.calories} kcal</span>
          <span className="rounded-lg bg-muted px-1 py-1.5">{p.protein}g prot.</span>
          <span className="rounded-lg bg-muted px-1 py-1.5">{p.carbs}g carb.</span>
        </div>

        <div className="mt-auto pt-2">
          <a href="/#planos" className="block">
            <Button size="sm" variant="outline" className="w-full">
              <Layers3 className="h-4 w-4" /> Escolher em um plano
            </Button>
          </a>
        </div>
      </div>
    </article>
  );
}
