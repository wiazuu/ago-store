import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Search, SlidersHorizontal } from "lucide-react";
import { ProductCard } from "@/components/shop/ProductCard";
import { Input } from "@/components/ui/input";
import { useObjectives, useProducts } from "@/store/admin-store";
import { useInitialPublicContent } from "@/components/PublicContentProvider";
const searchSchema = z.object({ q: z.string().optional() });
export const Route = createFileRoute("/cardapio")({
  validateSearch: searchSchema,
  component: Menu,
});
function Menu() {
  const { q } = Route.useSearch();
  const initialContent = useInitialPublicContent();
  const storedProducts = useProducts();
  const storedObjectives = useObjectives();
  const products = (initialContent?.products ?? storedProducts).filter((p) => p.active);
  const objectives = (initialContent?.objectives ?? storedObjectives).filter((o) => o.active);
  const [text, setText] = useState(q || "");
  const [objective, setObjective] = useState("");
  const [tag, setTag] = useState("");
  const [maxCalories, setMaxCalories] = useState("");
  const [minProtein, setMinProtein] = useState("");
  const tags = Array.from(new Set(products.flatMap((p) => p.tags))).sort();
  const filtered = useMemo(
    () =>
      products.filter((p) => {
        const query = text.trim().toLowerCase();
        return (
          (!query ||
            `${p.name} ${p.shortDescription} ${p.ingredients} ${p.tags.join(" ")}`
              .toLowerCase()
              .includes(query)) &&
          (!objective || p.objectiveIds.includes(objective)) &&
          (!tag || p.tags.includes(tag)) &&
          (!maxCalories || p.calories <= Number(maxCalories)) &&
          (!minProtein || p.protein >= Number(minProtein))
        );
      }),
    [products, text, objective, tag, maxCalories, minProtein],
  );
  return (
    <main className="container-page py-10 sm:py-16">
      <header>
        <p className="section-kicker">Escolha do seu jeito</p>
        <h1 className="font-display text-4xl">Cardápio completo</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Filtre por objetivo, composição e necessidades alimentares.
        </p>
      </header>
      <section className="mt-7 rounded-3xl border bg-card p-5">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Prato, ingrediente ou objetivo"
          />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select
            className="h-10 rounded-md border bg-background px-3 text-sm"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
          >
            <option value="">Todos os objetivos</option>
            {objectives.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border bg-background px-3 text-sm"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
          >
            <option value="">Todos os perfis</option>
            {tags.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <Input
            type="number"
            min={0}
            value={maxCalories}
            onChange={(e) => setMaxCalories(e.target.value)}
            placeholder="Máximo de calorias"
          />
          <Input
            type="number"
            min={0}
            value={minProtein}
            onChange={(e) => setMinProtein(e.target.value)}
            placeholder="Mínimo de proteína (g)"
          />
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <SlidersHorizontal className="h-4 w-4" />
          {filtered.length} opções encontradas
        </div>
      </section>
      {filtered.length ? (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((product) => (
            <ProductCard key={product.id} p={product} />
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-3xl border border-dashed p-12 text-center text-muted-foreground">
          Nenhuma refeição corresponde aos filtros.
        </div>
      )}
      <p className="mt-8 rounded-2xl bg-muted p-4 text-xs leading-5 text-muted-foreground">
        Os filtros de alergênicos são informativos. Em caso de alergia, fale com a equipe antes de
        comprar para confirmar ingredientes e risco de contaminação cruzada.
      </p>
    </main>
  );
}
