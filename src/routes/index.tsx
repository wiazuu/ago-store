import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useHome,
  useCategories,
  useObjectives,
  useProducts,
  useKits,
  useInstitutional,
} from "@/store/admin-store";
import { ProductCard } from "@/components/shop/ProductCard";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { brl } from "@/lib/format";
import { useShopStore } from "@/store/shop-store";

export const Route = createFileRoute("/")({ component: HomePage });

function Icon({ name, className }: { name: string; className?: string }) {
  const iconLibrary = Icons as unknown as Record<string, LucideIcon>;
  const C = iconLibrary[name] ?? Icons.Sparkles;
  return <C className={className} />;
}

function HomePage() {
  const home = useHome();
  const cats = useCategories()
    .filter((c) => c.active)
    .sort((a, b) => a.order - b.order);
  const objectives = useObjectives()
    .filter((o) => o.active)
    .sort((a, b) => a.order - b.order);
  const products = useProducts();
  const kits = useKits().filter((k) => k.active);
  const inst = useInstitutional();
  const add = useShopStore((s) => s.add);

  const featured = products.filter((p) => p.featured && p.active).slice(0, 8);
  const hasContent: Record<string, boolean> = {
    hero: Boolean(home.hero.title.trim() && home.hero.image.trim()),
    benefits: home.benefits.some((item) => item.title.trim()),
    categories: cats.length > 0,
    objectives: objectives.length > 0,
    featured: featured.length > 0,
    kits: kits.length > 0,
    midBanner: Boolean(home.midBanner.active && home.midBanner.title.trim() && home.midBanner.image.trim()),
    howItWorks: home.howItWorks.some((item) => item.title.trim()),
    testimonials: home.testimonials.some((item) => item.name.trim() && item.text.trim()),
    about: Boolean(home.aboutShort.title.trim() && home.aboutShort.text.trim() && home.aboutShort.image.trim()),
    faq: home.faq.some((item) => item.question.trim() && item.answer.trim()),
  };
  const sections = home.sections
    .filter((section) => section.active && hasContent[section.key])
    .sort((a, b) => a.order - b.order);

  const render: Record<string, React.ReactNode> = {
    hero: (
      <section className="container-page pt-4 sm:pt-6 lg:pt-10">
        <div className="relative grid overflow-hidden rounded-[2rem] bg-secondary text-cream brand-shadow-lg lg:grid-cols-[1.02fr_.98fr]">
          <div className="relative z-10 flex flex-col justify-center p-7 sm:p-10 lg:min-h-[590px] lg:p-16">
            <h1 className="max-w-2xl whitespace-pre-line font-display text-[2.65rem] leading-[.98] sm:text-6xl lg:text-7xl">
              {home.hero.title}
            </h1>
            {home.hero.subtitle && <p className="mt-5 max-w-xl text-base leading-relaxed text-cream/75 sm:text-lg">{home.hero.subtitle}</p>}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {home.hero.ctaText && home.hero.ctaLink && <Link to={home.hero.ctaLink as "/"}>
                <Button size="lg" className="w-full sm:w-auto">
                  {home.hero.ctaText}
                </Button>
              </Link>}
              {home.hero.ctaSecondaryText && home.hero.ctaSecondaryLink && <Link to={home.hero.ctaSecondaryLink as "/"}>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full border-cream/30 bg-transparent text-cream hover:bg-cream hover:text-charcoal sm:w-auto"
                >
                  {home.hero.ctaSecondaryText}
                </Button>
              </Link>}
            </div>
          </div>
          <div className="relative m-3 min-h-80 overflow-hidden rounded-[1.55rem] sm:m-5 lg:min-h-0">
            <img
              src={home.hero.image}
              alt={home.hero.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal/30 via-transparent to-transparent" />
          </div>
          <div className="pointer-events-none absolute -bottom-16 -left-14 h-52 w-52 rounded-full border-[34px] border-primary/15" />
        </div>
      </section>
    ),

    benefits: (
      <section className="container-page py-12 sm:py-16">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-4">
          {home.benefits.filter((item) => item.title.trim()).map((b) => (
            <div
              key={b.id}
              className="rounded-2xl border border-border/70 bg-card/60 p-4 text-center last:col-span-2 md:last:col-span-1 sm:p-5"
            >
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-green-soft text-secondary">
                <Icon name={b.icon} className="h-5 w-5" />
              </div>
              <div className="mb-1 text-sm font-bold">{b.title}</div>
              <p className="text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
                {b.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    ),

    categories: (
      <section className="container-page py-10 sm:py-14">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="section-kicker">Para todo momento</p>
            <h2 className="mt-1 font-display text-3xl md:text-4xl">Compre por categoria</h2>
            <p className="text-muted-foreground mt-2">
              Explore nossa cozinha por estilo de refeição
            </p>
          </div>
        </div>
        <div className="scrollbar-none -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-4 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 lg:grid-cols-6">
          {cats.slice(0, 6).map((c) => (
            <Link
              key={c.id}
              to="/categoria/$slug"
              params={{ slug: c.slug }}
              className="group relative aspect-[3/4] w-[68vw] max-w-64 shrink-0 snap-center overflow-hidden rounded-3xl brand-shadow md:w-auto md:max-w-none"
            >
              <img
                src={c.image}
                alt={c.name}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/85 via-charcoal/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 text-cream">
                <div className="font-display text-xl leading-tight">{c.name}</div>
                <div className="mt-1 text-xs text-cream/70">{c.description}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    ),

    objectives: (
      <section className="container-page py-10 sm:py-14">
        <div className="mb-8">
          <p className="section-kicker">Do seu jeito</p>
          <h2 className="mt-1 font-display text-3xl md:text-4xl">Compre por objetivo</h2>
          <p className="text-muted-foreground mt-2">Refeições organizadas pelo que você busca</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 md:gap-4">
          {objectives.map((o) => (
            <Link
              key={o.id}
              to="/objetivo/$slug"
              params={{ slug: o.slug }}
              className="group flex items-center gap-4 rounded-2xl border border-transparent bg-card p-4 brand-shadow transition hover:border-secondary/20 hover:brand-shadow-lg sm:p-5"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-soft text-secondary transition group-hover:bg-secondary group-hover:text-cream">
                <Icon name={o.icon} className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold text-sm">{o.name}</div>
                <div className="text-xs text-muted-foreground line-clamp-2">{o.description}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    ),

    featured: (
      <section className="container-page py-10 sm:py-14">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="section-kicker">Os queridinhos</p>
            <h2 className="mt-1 font-display text-3xl md:text-4xl">Destaques da semana</h2>
            <p className="text-muted-foreground mt-2">
              O que está saindo mais rápido da nossa cozinha
            </p>
          </div>
          <Link
            to="/categoria/$slug"
            params={{ slug: "dia-a-dia" }}
            className="text-primary text-sm font-medium hidden md:block"
          >
            Ver tudo →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4 lg:gap-6">
          {featured.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      </section>
    ),

    kits: (
      <section className="container-page py-10 sm:py-14">
        <div className="mb-8">
          <p className="section-kicker">Mais praticidade</p>
          <h2 className="mt-1 font-display text-3xl md:text-4xl">Kits semanais</h2>
          <p className="text-muted-foreground mt-2">Cardápios prontos com desconto exclusivo</p>
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">
          {kits.slice(0, 3).map((k) => (
            <div
              key={k.id}
              className="group flex flex-col overflow-hidden rounded-3xl bg-card brand-shadow"
            >
              <div className="relative aspect-[4/3]">
                <img src={k.image} alt={k.name} className="w-full h-full object-cover" />
                <span className="absolute top-3 left-3 bg-secondary text-secondary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                  -{k.discountPct}%
                </span>
              </div>
              <div className="p-5 flex flex-col flex-1">
                <div className="font-display text-xl mb-1">{k.name}</div>
                <p className="text-sm text-muted-foreground mb-4 flex-1">{k.description}</p>
                <div className="flex items-center justify-between">
                  <div className="font-display text-2xl">{brl(k.price)}</div>
                  <Button
                    onClick={() =>
                      add({ productId: k.id, name: k.name, image: k.image, price: k.price })
                    }
                  >
                    Comprar kit
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    ),

    midBanner: home.midBanner.active && (
      <section className="container-page py-8 sm:py-12">
        <div className="relative overflow-hidden rounded-[2rem] bg-charcoal text-cream brand-shadow-lg">
          <img
            src={home.midBanner.image}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-40"
          />
          <div className="relative max-w-2xl p-7 sm:p-12 md:p-16">
            <p className="section-kicker text-primary">Monte sua semana</p>
            <h3 className="font-display text-3xl md:text-5xl mb-3">{home.midBanner.title}</h3>
            <p className="text-cream/80 mb-6">{home.midBanner.subtitle}</p>
            <Link to={home.midBanner.ctaLink as "/"}>
              <Button size="lg" className="rounded-full">
                {home.midBanner.ctaText}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    ),

    howItWorks: (
      <section className="container-page py-12 sm:py-20">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl">Como funciona</h2>
          <p className="text-muted-foreground mt-2">Do clique ao prato, em 4 passos</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {home.howItWorks.filter((item) => item.title.trim()).map((s) => (
            <div
              key={s.id}
              className="relative overflow-hidden rounded-3xl bg-card p-6 text-center brand-shadow"
            >
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-display text-xl">
                {s.step}
              </div>
              <div className="mb-2">
                <Icon name={s.icon} className="w-6 h-6 mx-auto text-charcoal" />
              </div>
              <div className="font-semibold mb-1">{s.title}</div>
              <p className="text-sm text-muted-foreground">{s.description}</p>
            </div>
          ))}
        </div>
      </section>
    ),

    testimonials: (
      <section className="container-page py-12 sm:py-20">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl">Quem come, conta</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {home.testimonials.filter((item) => item.name.trim() && item.text.trim()).map((t) => (
            <div key={t.id} className="rounded-3xl bg-card p-6 brand-shadow">
              <div className="flex gap-0.5 text-primary mb-3">{"★".repeat(t.rating)}</div>
              <p className="text-sm mb-4 italic">"{t.text}"</p>
              <div className="text-sm font-semibold">{t.name}</div>
              <div className="text-xs text-muted-foreground">{t.role}</div>
            </div>
          ))}
        </div>
      </section>
    ),

    about: (
      <section className="container-page py-12 sm:py-20">
        <div className="grid items-center gap-8 md:grid-cols-2 lg:gap-14">
          <div className="aspect-[4/3] overflow-hidden rounded-[2rem] md:aspect-square">
            <img src={home.aboutShort.image} alt="" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="text-primary text-xs font-semibold uppercase tracking-wider mb-4">
              Nossa história
            </div>
            <h2 className="font-display text-3xl md:text-5xl mb-5 leading-tight">
              {home.aboutShort.title}
            </h2>
            <p className="text-muted-foreground mb-6">{home.aboutShort.text}</p>
            <Button variant="outline" className="rounded-full">
              Conheça a agô
            </Button>
          </div>
        </div>
      </section>
    ),

    faq: (
      <section className="container-page py-12 sm:py-20">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl md:text-4xl">Perguntas frequentes</h2>
          </div>
          <Accordion type="single" collapsible className="space-y-2">
            {home.faq.filter((item) => item.question.trim() && item.answer.trim()).map((f) => (
              <AccordionItem key={f.id} value={f.id} className="border rounded-xl px-4 bg-card">
                <AccordionTrigger className="text-left">{f.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    ),
  };

  return (
    <main>
      {sections.length === 0 && (
        <section className="container-page py-20 text-center sm:py-28">
          <p className="section-kicker">Loja em atualização</p>
          <h1 className="mx-auto mt-2 max-w-2xl font-display text-4xl sm:text-5xl">O cardápio será publicado em breve.</h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">Estamos preparando as informações oficiais da loja.</p>
        </section>
      )}
      {sections.map((s) => (
        <div key={s.key}>{render[s.key]}</div>
      ))}
    </main>
  );
}
