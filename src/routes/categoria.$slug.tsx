import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useCategories, useProducts } from "@/store/admin-store";
import { ProductCard } from "@/components/shop/ProductCard";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SlidersHorizontal, X } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/categoria/$slug")({
  validateSearch: z.object({ q: z.string().optional() }),
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const { q } = Route.useSearch();
  const categories = useCategories();
  const products = useProducts();
  const category = categories.find((c) => c.slug === slug);
  if (!category) throw notFound();

  const [sort, setSort] = useState("relevancia");
  const [priceMax, setPriceMax] = useState(80);
  const [caloriesMax, setCaloriesMax] = useState(700);
  const [proteinMin, setProteinMin] = useState(0);
  const [filters, setFilters] = useState<Record<string, boolean>>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const toggle = (k: string) => setFilters((f) => ({ ...f, [k]: !f[k] }));

  const filtered = useMemo(() => {
    let list = products.filter((p) => p.categoryId === category.id && p.active);
    if (q?.trim()) {
      const query = q.trim().toLocaleLowerCase("pt-BR");
      list = list.filter((product) =>
        [product.name, product.shortDescription, product.ingredients, ...product.tags]
          .join(" ")
          .toLocaleLowerCase("pt-BR")
          .includes(query),
      );
    }
    list = list.filter(
      (p) => p.price <= priceMax && p.calories <= caloriesMax && p.protein >= proteinMin,
    );
    if (filters["sem-lactose"]) list = list.filter((p) => p.tags.includes("sem lactose"));
    if (filters["sem-gluten"]) list = list.filter((p) => p.tags.includes("sem glúten"));
    if (filters["vegetariano"])
      list = list.filter((p) => p.tags.includes("vegetariano") || p.tags.includes("vegano"));
    if (filters["mais-vendidos"]) list = list.filter((p) => p.bestSeller);
    if (filters["lancamentos"]) list = list.filter((p) => p.isNew);
    if (filters["promocoes"]) list = list.filter((p) => p.promoPrice);
    if (sort === "menor-preco")
      list = [...list].sort((a, b) => (a.promoPrice ?? a.price) - (b.promoPrice ?? b.price));
    if (sort === "maior-preco")
      list = [...list].sort((a, b) => (b.promoPrice ?? b.price) - (a.promoPrice ?? a.price));
    if (sort === "mais-proteina") list = [...list].sort((a, b) => b.protein - a.protein);
    if (sort === "menos-calorias") list = [...list].sort((a, b) => a.calories - b.calories);
    return list;
  }, [products, category.id, priceMax, caloriesMax, proteinMin, filters, sort, q]);

  return (
    <main>
      <div className="relative h-56 overflow-hidden sm:h-64 md:h-80">
        <img
          src={category.image}
          alt={category.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-charcoal/70 to-charcoal/30" />
        <div className="container-page h-full flex flex-col justify-end pb-8 relative text-cream">
          <div className="text-xs uppercase tracking-widest mb-2 opacity-80">
            <Link to="/" className="hover:text-primary">
              Home
            </Link>{" "}
            / Categorias
          </div>
          <h1 className="font-display text-4xl md:text-6xl">{category.name}</h1>
          <p className="mt-2 max-w-xl">{category.description}</p>
        </div>
      </div>

      <div className="container-page grid grid-cols-1 gap-8 py-8 lg:grid-cols-[260px_1fr] lg:py-10">
        <aside
          className={`${filtersOpen ? "block" : "hidden"} space-y-6 rounded-3xl bg-card p-5 brand-shadow lg:sticky lg:top-32 lg:block lg:self-start`}
        >
          <div className="flex items-center justify-between lg:hidden">
            <h2 className="font-display text-xl">Filtros</h2>
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-muted"
              aria-label="Fechar filtros"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider mb-2 text-muted-foreground">
              Preço até
            </div>
            <Slider
              value={[priceMax]}
              onValueChange={(v) => setPriceMax(v[0])}
              max={80}
              min={10}
              step={1}
            />
            <div className="text-sm mt-2">até R$ {priceMax}</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider mb-2 text-muted-foreground">
              Calorias até
            </div>
            <Slider
              value={[caloriesMax]}
              onValueChange={(v) => setCaloriesMax(v[0])}
              max={700}
              min={200}
              step={20}
            />
            <div className="text-sm mt-2">até {caloriesMax} kcal</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider mb-2 text-muted-foreground">
              Proteína mínima
            </div>
            <Slider
              value={[proteinMin]}
              onValueChange={(v) => setProteinMin(v[0])}
              max={50}
              min={0}
              step={2}
            />
            <div className="text-sm mt-2">a partir de {proteinMin}g</div>
          </div>
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Dieta
            </div>
            {[
              ["sem-lactose", "Sem lactose"],
              ["sem-gluten", "Sem glúten"],
              ["vegetariano", "Vegetariano"],
            ].map(([k, l]) => (
              <label key={k} className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox checked={!!filters[k]} onCheckedChange={() => toggle(k)} /> {l}
              </label>
            ))}
          </div>
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Destaques
            </div>
            {[
              ["mais-vendidos", "Mais vendidos"],
              ["lancamentos", "Lançamentos"],
              ["promocoes", "Promoções"],
            ].map(([k, l]) => (
              <label key={k} className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox checked={!!filters[k]} onCheckedChange={() => toggle(k)} /> {l}
              </label>
            ))}
          </div>
        </aside>

        <div>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              {filtered.length} produtos{q ? ` para “${q}”` : ""}
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              <button
                type="button"
                onClick={() => setFiltersOpen((open) => !open)}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full border bg-card px-4 text-sm font-semibold lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" /> Filtros
              </button>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="h-11 flex-1 rounded-full sm:w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevancia">Relevância</SelectItem>
                  <SelectItem value="menor-preco">Menor preço</SelectItem>
                  <SelectItem value="maior-preco">Maior preço</SelectItem>
                  <SelectItem value="mais-proteina">Mais proteína</SelectItem>
                  <SelectItem value="menos-calorias">Menos calorias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              Nenhum produto encontrado com esses filtros.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 xl:gap-6">
              {filtered.map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            </div>
          )}
        </div>
      </div>

      {category.seoText && (
        <section className="container-page py-16">
          <div className="max-w-3xl mx-auto text-muted-foreground text-sm leading-relaxed">
            <h2 className="font-display text-2xl text-foreground mb-3">{category.name}</h2>
            <p>{category.seoText}</p>
          </div>
        </section>
      )}
    </main>
  );
}
