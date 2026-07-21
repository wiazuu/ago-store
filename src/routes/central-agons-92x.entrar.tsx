import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppearance } from "@/store/admin-store";
import { useShopStore } from "@/store/shop-store";

export const Route = createFileRoute("/central-agons-92x/entrar")({ component: AdminLogin });
function AdminLogin() {
  const [username, setUsername] = useState(""); const [password, setPassword] = useState("");
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  const setAdmin = useShopStore((state) => state.setAdminAuth); const appearance = useAppearance(); const navigate = useNavigate();
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin-session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      const payload = (await response.json()) as { error?: string; csrfToken?: string };
      if (!response.ok || !payload.csrfToken) throw new Error(payload.error || "Não foi possível entrar.");
      sessionStorage.setItem("ago-admin-csrf", payload.csrfToken); setAdmin(true); navigate({ to: "/central-agons-92x" });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao entrar."); } finally { setLoading(false); }
  }
  return <main className="grid min-h-screen place-items-center bg-muted/40 px-4 py-10"><form onSubmit={submit} className="w-full max-w-md rounded-3xl border bg-card p-6 shadow-xl sm:p-8"><div className="mb-7 flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground"><ShieldCheck /></div><div><div className="font-display text-2xl">{appearance.brandName}</div><p className="text-sm text-muted-foreground">Central de gestão protegida</p></div></div><div className="space-y-4"><div><Label htmlFor="admin-user">Usuário</Label><Input id="admin-user" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required /></div><div><div className="flex items-center justify-between"><Label htmlFor="admin-password">Senha</Label><Link to="/central-agons-92x/esqueci-senha" className="text-xs font-semibold text-primary-dark hover:underline">Esqueci minha senha</Link></div><Input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></div>{error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}<Button className="h-11 w-full rounded-xl" disabled={loading}>{loading ? "Validando..." : "Entrar com segurança"}</Button></div><Link to="/" className="mt-6 block text-center text-sm text-muted-foreground hover:text-primary">Voltar para a loja</Link></form></main>;
}
