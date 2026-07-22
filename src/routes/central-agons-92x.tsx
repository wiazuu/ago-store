import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Boxes,
  CalendarDays,
  ChefHat,
  FileText,
  Home,
  Image,
  LayoutDashboard,
  LogOut,
  Package,
  Palette,
  ShoppingCart,
  Tags,
  Target,
  Ticket,
  Store,
  Truck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AdminPublishButton } from "@/components/admin/AdminPublishButton";
import { useAppearance } from "@/store/admin-store";
import { useShopStore } from "@/store/shop-store";
import { useAdminStore, type AdminData } from "@/store/admin-store";

export const Route = createFileRoute("/central-agons-92x")({ component: AdminLayout });

type AdminPath =
  | "/central-agons-92x"
  | "/central-agons-92x/home"
  | "/central-agons-92x/produtos"
  | "/central-agons-92x/categorias"
  | "/central-agons-92x/objetivos"
  | "/central-agons-92x/kits"
  | "/central-agons-92x/pedidos"
  | "/central-agons-92x/banners"
  | "/central-agons-92x/cupons"
  | "/central-agons-92x/conteudo"
  | "/central-agons-92x/aparencia"
  | "/central-agons-92x/emporio"
  | "/central-agons-92x/calendario"
  | "/central-agons-92x/logistica"
  | "/central-agons-92x/producao"
  | "/central-agons-92x/clientes"
  | "/central-agons-92x/relatorios";
type NavItem = { to: AdminPath; label: string; icon: LucideIcon; exact?: boolean };
const NAV: NavItem[] = [
  { to: "/central-agons-92x", label: "Visão geral", icon: LayoutDashboard, exact: true },
  { to: "/central-agons-92x/home", label: "Página inicial", icon: Home },
  { to: "/central-agons-92x/produtos", label: "Refeições", icon: Package },
  { to: "/central-agons-92x/emporio", label: "Empório", icon: Store },
  { to: "/central-agons-92x/categorias", label: "Categorias", icon: Tags },
  { to: "/central-agons-92x/objetivos", label: "Objetivos", icon: Target },
  { to: "/central-agons-92x/kits", label: "Kits", icon: Boxes },
  { to: "/central-agons-92x/pedidos", label: "Pedidos", icon: ShoppingCart },
  { to: "/central-agons-92x/calendario", label: "Calendário", icon: CalendarDays },
  { to: "/central-agons-92x/logistica", label: "Logística", icon: Truck },
  { to: "/central-agons-92x/producao", label: "Produção", icon: ChefHat },
  { to: "/central-agons-92x/clientes", label: "Clientes", icon: Users },
  { to: "/central-agons-92x/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/central-agons-92x/banners", label: "Banners", icon: Image },
  { to: "/central-agons-92x/cupons", label: "Cupons", icon: Ticket },
  { to: "/central-agons-92x/conteudo", label: "Textos e contato", icon: FileText },
  { to: "/central-agons-92x/aparencia", label: "Marca e aparência", icon: Palette },
];

function AdminLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const authed = useShopStore((state) => state.adminAuthed);
  const setAdmin = useShopStore((state) => state.setAdminAuth);
  const navigate = useNavigate();
  const appearance = useAppearance();
  const loginPage = [
    "/central-agons-92x/entrar",
    "/central-agons-92x/esqueci-senha",
    "/central-agons-92x/redefinir-senha",
  ].includes(pathname);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const persistence = useShopStore.persist;
    if (!persistence) {
      setHydrated(true);
      return;
    }
    const unsubscribe = persistence.onFinishHydration(() => setHydrated(true));
    setHydrated(persistence.hasHydrated());
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!hydrated || loginPage) return;
    void fetch("/api/admin-session", { cache: "no-store" })
      .then((response) => response.json())
      .then((session: { authenticated?: boolean }) => {
        if (!session.authenticated) {
          setAdmin(false);
          navigate({ to: "/central-agons-92x/entrar" });
          return;
        }
        return fetch("/api/admin-state", { cache: "no-store" })
          .then((response) => response.json())
          .then((payload: { data?: AdminData }) => {
            if (payload.data) useAdminStore.getState().replaceData(payload.data);
          });
      })
      .catch(() => navigate({ to: "/central-agons-92x/entrar" }));
  }, [hydrated, loginPage, navigate, setAdmin]);

  if (loginPage) return <Outlet />;
  if (!hydrated || !authed) return null;

  const logout = async () => {
    await fetch("/api/admin-session", {
      method: "DELETE",
      headers: { "x-csrf-token": sessionStorage.getItem("ago-admin-csrf") || "" },
    }).catch(() => undefined);
    sessionStorage.removeItem("ago-admin-csrf");
    setAdmin(false);
    navigate({ to: "/" });
  };

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-64 flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <div className="border-b border-sidebar-border p-6">
          <div className="inline-flex rounded-xl bg-primary px-3 py-1.5 font-display text-2xl text-primary-foreground">
            {appearance.logoText}
          </div>
          <div className="mt-2 text-xs uppercase tracking-wider text-sidebar-foreground/60">
            Central de gestão
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${active ? "bg-sidebar-accent-active text-primary" : "hover:bg-sidebar-accent"}`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-sidebar-accent"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b bg-card/95 px-4 py-3 backdrop-blur-xl sm:px-6 sm:py-4">
          <div>
            <div className="text-xs text-muted-foreground">
              {NAV.find((item) =>
                item.exact ? pathname === item.to : pathname.startsWith(item.to),
              )?.label || "Administração"}
            </div>
            <div className="font-display text-lg sm:text-xl">Painel {appearance.brandName}</div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="hidden text-sm text-muted-foreground hover:text-primary sm:block"
            >
              Ver loja →
            </a>
            <AdminPublishButton />
          </div>
        </header>
        <nav className="scrollbar-none flex gap-1 overflow-x-auto border-b bg-card px-3 py-2 lg:hidden">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold ${active ? "bg-secondary text-secondary-foreground" : "bg-muted text-foreground"}`}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
