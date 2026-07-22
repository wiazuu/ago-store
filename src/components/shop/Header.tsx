import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useCartCount, useShopStore } from "@/store/shop-store";
import { useCategories, useHome } from "@/store/admin-store";
import { BrandLogo } from "@/components/shop/BrandLogo";
import { useInitialPublicContent } from "@/components/PublicContentProvider";

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const count = useCartCount();
  const openCart = useShopStore((state) => state.openDrawer);
  const customerAuthed = useShopStore((state) => state.authed);
  const initialContent = useInitialPublicContent();
  const storedHome = useHome();
  const storedCategories = useCategories();
  const home = initialContent?.home ?? storedHome;
  const categories = (initialContent?.categories ?? storedCategories)
    .filter((category) => category.active)
    .sort((a, b) => a.order - b.order);
  const navigate = useNavigate();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };

    document.body.style.overflow = mobileOpen ? "hidden" : "";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileOpen]);

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!search.trim()) return;
    navigate({
      to: "/cardapio",
      search: { q: search.trim() },
    });
    setSearch("");
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur-xl">
      {home.promoBar.active && home.promoBar.text.trim() && (
        <div className="bg-secondary px-4 py-2 text-center text-[11px] font-semibold tracking-wide text-cream sm:text-xs">
          {home.promoBar.link ? (
            <Link to={home.promoBar.link as never} className="hover:text-primary">
              {home.promoBar.text}
            </Link>
          ) : (
            <span>{home.promoBar.text}</span>
          )}
        </div>
      )}

      <div className="container-page flex h-[72px] items-center gap-2 sm:gap-4">
        <button
          type="button"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-muted lg:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu"
          aria-expanded={mobileOpen}
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link to="/" className="shrink-0" aria-label="agô — página inicial">
          <BrandLogo compact={false} className="max-sm:[&_.ago-wordmark]:hidden" />
        </Link>

        <form onSubmit={onSubmit} className="mx-auto hidden w-full max-w-xl md:block">
          <label className="relative block">
            <span className="sr-only">Buscar no cardápio</span>
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Busque por prato, ingrediente ou objetivo"
              className="h-11 w-full rounded-full border border-border bg-card/75 pl-11 pr-4 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
            />
          </label>
        </form>

        <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
          <Link
            to={customerAuthed ? "/minha-conta" : "/login"}
            className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-muted hover:text-secondary"
            aria-label="Minha conta"
          >
            <User className="h-5 w-5" />
          </Link>
          <button
            type="button"
            onClick={openCart}
            className="relative flex h-11 w-11 items-center justify-center rounded-full hover:bg-muted hover:text-secondary"
            aria-label={`Sacola com ${count} itens`}
          >
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-extrabold text-charcoal">
                {count}
              </span>
            )}
          </button>
        </div>
      </div>

      <nav
        className="border-t border-border/60 bg-card/80 lg:hidden"
        aria-label="Categorias rápidas"
      >
        <div className="scrollbar-none flex gap-2 overflow-x-auto px-4 py-2.5">
          <Link
            to="/emporio"
            className="shrink-0 rounded-full border border-primary bg-primary px-3.5 py-2 text-xs font-extrabold text-primary-foreground"
          >
            Empório
          </Link>
          <Link
            to="/cardapio"
            search={{}}
            className="shrink-0 rounded-full border bg-background px-3.5 py-2 text-xs font-extrabold"
          >
            Cardápio
          </Link>
          {categories.slice(0, 5).map((category, index) => (
            <Link
              key={category.id}
              to="/categoria/$slug"
              params={{ slug: category.slug }}
              className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-extrabold transition active:scale-95 ${
                index === 0
                  ? "border-secondary bg-secondary text-secondary-foreground"
                  : "border-border bg-background text-foreground"
              }`}
            >
              {category.name}
            </Link>
          ))}
        </div>
      </nav>

      <nav className="hidden border-t border-border/60 lg:block" aria-label="Cardápio">
        <div className="container-page scrollbar-none flex items-center gap-7 overflow-x-auto py-3 text-sm font-semibold">
          <Link to="/emporio" className="shrink-0 font-extrabold text-primary-dark">
            Empório
          </Link>
          <Link to="/cardapio" search={{}} className="shrink-0 font-extrabold text-secondary">
            Cardápio completo
          </Link>
          {categories.slice(0, 7).map((category) => (
            <Link
              key={category.id}
              to="/categoria/$slug"
              params={{ slug: category.slug }}
              className="shrink-0 transition-colors hover:text-secondary"
            >
              {category.name}
            </Link>
          ))}
        </div>
      </nav>

      {mobileOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] bg-charcoal/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          >
            <aside
              className="absolute inset-y-0 left-0 flex h-[100dvh] w-[92vw] max-w-md flex-col overflow-hidden rounded-r-[2rem] bg-background shadow-2xl"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
            >
              <div className="flex items-center justify-between border-b bg-card px-5 py-4">
                <Link to="/" onClick={() => setMobileOpen(false)}>
                  <BrandLogo />
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-muted"
                  aria-label="Fechar menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overscroll-contain overflow-y-auto px-5 py-5">
                <form onSubmit={onSubmit} className="mb-6">
                  <label className="relative block">
                    <span className="sr-only">Buscar no cardápio</span>
                    <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Buscar prato ou ingrediente"
                      className="h-12 w-full rounded-full border bg-card pl-11 pr-4 text-sm outline-none focus:border-primary"
                      autoFocus
                    />
                  </label>
                </form>

                <div className="mb-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="section-kicker">Escolha sua linha</p>
                    <h2 className="mt-1 font-display text-2xl">Cardápio agô</h2>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {categories.length} categorias
                  </span>
                </div>

                <div className="mb-6 grid grid-cols-3 gap-2">
                  {categories.slice(0, 3).map((category) => (
                    <Link
                      key={category.id}
                      to="/categoria/$slug"
                      params={{ slug: category.slug }}
                      onClick={() => setMobileOpen(false)}
                      className="group overflow-hidden rounded-2xl border bg-card shadow-sm"
                    >
                      <div className="aspect-square overflow-hidden bg-muted">
                        <img
                          src={category.image}
                          alt=""
                          className="h-full w-full object-cover transition duration-300 group-active:scale-105"
                        />
                      </div>
                      <span className="block min-h-12 px-2 py-2 text-center text-[11px] font-extrabold leading-tight">
                        {category.name}
                      </span>
                    </Link>
                  ))}
                </div>

                <p className="section-kicker mb-2">Mais opções</p>
                <ul className="divide-y divide-border/70 rounded-2xl border bg-card px-2">
                  <li>
                    <Link
                      to="/emporio"
                      onClick={() => setMobileOpen(false)}
                      className="flex min-h-12 items-center justify-between rounded-xl px-3 py-3 text-sm font-bold text-primary-dark hover:bg-muted"
                    >
                      Empório
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </li>
                  {categories.slice(3).map((category) => (
                    <li key={category.id}>
                      <Link
                        to="/categoria/$slug"
                        params={{ slug: category.slug }}
                        onClick={() => setMobileOpen(false)}
                        className="flex min-h-12 items-center justify-between rounded-xl px-3 py-3 text-sm font-bold hover:bg-muted hover:text-secondary"
                      >
                        {category.name}
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 border-t pt-5">
                  <p className="section-kicker mb-3">Sua conta</p>
                  <Link
                    to={customerAuthed ? "/minha-conta" : "/login"}
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-xl px-3 py-3 font-semibold hover:bg-muted"
                  >
                    {customerAuthed ? "Minha conta" : "Entrar"}
                  </Link>
                </div>
              </div>

              <div className="border-t bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    openCart();
                  }}
                  className="flex h-13 w-full items-center justify-between rounded-2xl bg-primary px-5 font-extrabold text-primary-foreground shadow-sm active:scale-[.98]"
                >
                  <span className="flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5" /> Ver minha sacola
                  </span>
                  <span className="rounded-full bg-charcoal/10 px-2.5 py-1 text-xs">{count}</span>
                </button>
              </div>
            </aside>
          </div>,
          document.body,
        )}
    </header>
  );
}
