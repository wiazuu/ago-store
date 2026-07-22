import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useObjectives, useProducts } from "@/store/admin-store";
import { ProductCard } from "@/components/shop/ProductCard";
import { useInitialPublicContent } from "@/components/PublicContentProvider";

export const Route = createFileRoute("/objetivo/$slug")({ component: ObjectivePage });

function ObjectivePage() {
  const { slug } = Route.useParams();
  const initialContent = useInitialPublicContent();
  const storedObjectives = useObjectives();
  const storedProducts = useProducts();
  const objectives = initialContent?.objectives ?? storedObjectives;
  const products = initialContent?.products ?? storedProducts;
  const objective = objectives.find((o) => o.slug === slug);
  if (!objective) throw notFound();

  const list = products.filter(
    (product) =>
      product.active &&
      (objective.productIds.includes(product.id) || product.objectiveIds.includes(objective.id)),
  );

  return (
    <main>
      <div className="relative h-56 overflow-hidden sm:h-64 md:h-80">
        <img
          src={objective.image}
          alt={objective.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-secondary/80 to-secondary/30" />
        <div className="container-page h-full flex flex-col justify-end pb-8 relative text-cream">
          <div className="text-xs uppercase tracking-widest mb-2 opacity-80">
            <Link to="/" className="hover:text-primary">
              Home
            </Link>{" "}
            / Objetivos
          </div>
          <h1 className="font-display text-4xl md:text-6xl">{objective.name}</h1>
          <p className="mt-2 max-w-xl">{objective.description}</p>
        </div>
      </div>

      <div className="container-page py-10">
        <div className="mb-6 text-sm text-muted-foreground">
          {list.length} produtos para este objetivo
        </div>
        {list.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            Em breve mais opções para este objetivo.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {list.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
