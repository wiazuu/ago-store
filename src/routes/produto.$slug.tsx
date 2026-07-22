import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useProducts, useCategories } from "@/store/admin-store";
import { ProductCard } from "@/components/shop/ProductCard";
import { Button } from "@/components/ui/button";
import { Layers3 } from "lucide-react";
import { useInitialPublicContent } from "@/components/PublicContentProvider";

export const Route = createFileRoute("/produto/$slug")({ component: ProductPage });

function ProductPage() {
  const { slug } = Route.useParams();
  const initialContent = useInitialPublicContent();
  const storedProducts = useProducts();
  const storedCategories = useCategories();
  const products = initialContent?.products ?? storedProducts;
  const categories = initialContent?.categories ?? storedCategories;
  const p = products.find((x) => x.slug === slug);
  if (!p) throw notFound();
  const cat = categories.find((c) => c.id === p.categoryId);
  const [img, setImg] = useState(p.image);
  const related = products
    .filter((x) => x.categoryId === p.categoryId && x.id !== p.id)
    .slice(0, 4);

  return (
    <main className="container-page py-8">
      <div className="text-xs text-muted-foreground mb-6">
        <Link to="/" className="hover:text-primary">
          Home
        </Link>{" "}
        /{" "}
        {cat && (
          <>
            <Link to="/categoria/$slug" params={{ slug: cat.slug }} className="hover:text-primary">
              {cat.name}
            </Link>{" "}
            /{" "}
          </>
        )}
        <span>{p.name}</span>
      </div>

      <div className="mb-14 grid gap-8 md:grid-cols-2 lg:gap-14">
        <div>
          <div className="aspect-square rounded-2xl overflow-hidden bg-muted mb-3">
            <img src={img} alt={p.name} className="w-full h-full object-cover" />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {(p.gallery ?? [p.image]).map((g, i) => (
              <button
                key={i}
                onClick={() => setImg(g)}
                className={`aspect-square rounded-xl overflow-hidden border-2 ${img === g ? "border-primary" : "border-transparent"}`}
              >
                <img src={g} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex gap-1 flex-wrap mb-3">
            {p.tags.map((t) => (
              <span
                key={t}
                className="text-[10px] uppercase tracking-wider bg-muted px-2 py-0.5 rounded-full"
              >
                {t}
              </span>
            ))}
          </div>
          <h1 className="mb-3 font-display text-3xl leading-tight sm:text-4xl lg:text-5xl">
            {p.name}
          </h1>
          <p className="text-muted-foreground mb-6">{p.shortDescription}</p>

          <div className="mb-6 rounded-2xl bg-orange-soft p-5">
            <strong className="font-display text-xl">Disponível nos kits de refeições</strong>
            <p className="mt-1 text-sm text-muted-foreground">
              Este prato faz parte do cardápio de refeições. Escolha um kit e monte sua semana com
              até 3 sabores.
            </p>
            <a href="/#kits">
              <Button className="mt-4">
                <Layers3 className="h-4 w-4" /> Ver kits
              </Button>
            </a>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-3 rounded-2xl bg-orange-soft p-4 sm:grid-cols-4">
            {[
              ["kcal", p.calories],
              ["Proteína", `${p.protein}g`],
              ["Carbo", `${p.carbs}g`],
              ["Gordura", `${p.fats}g`],
            ].map(([l, v]) => (
              <div key={l} className="text-center">
                <div className="font-display text-xl">{v}</div>
                <div className="text-[10px] uppercase text-muted-foreground tracking-wider">
                  {l}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4 text-sm">
            <div>
              <div className="font-semibold mb-1">Descrição</div>
              <p className="text-muted-foreground">{p.description}</p>
            </div>
            <div>
              <div className="font-semibold mb-1">Ingredientes</div>
              <p className="text-muted-foreground">{p.ingredients}</p>
            </div>
            <div>
              <div className="font-semibold mb-1">Alérgenos</div>
              <p className="text-muted-foreground">{p.allergens}</p>
            </div>
            <div>
              <div className="font-semibold mb-1">Modo de preparo</div>
              <p className="text-muted-foreground">{p.preparation}</p>
            </div>
            <div className="grid grid-cols-1 gap-3 border-t pt-3 sm:grid-cols-3">
              <div>
                <div className="text-xs text-muted-foreground">Peso</div>
                <div>{p.weightG}g</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Validade</div>
                <div>{p.validity}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Conservação</div>
                <div className="text-xs">{p.storage}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section>
          <h2 className="font-display text-2xl md:text-3xl mb-6">Você também vai gostar</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {related.map((r) => (
              <ProductCard key={r.id} p={r} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
