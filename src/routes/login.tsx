import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppearance } from "@/store/admin-store";
import { useShopStore } from "@/store/shop-store";

export const Route = createFileRoute("/login")({ component: LoginPage });
function LoginPage() {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  const setAuth = useShopStore((state) => state.setAuth); const appearance = useAppearance(); const navigate = useNavigate();
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(""); setLoading(true);
    const response = await fetch("/api/customer-session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) setError(data.error || "Não foi possível entrar."); else { setAuth(true); navigate({ to: "/minha-conta" }); }
    setLoading(false);
  }
  return <main className="grid min-h-screen bg-background md:grid-cols-2"><section className="hidden items-center justify-center bg-primary p-12 text-primary-foreground md:flex"><div className="max-w-md"><div className="mb-8 inline-flex rounded-2xl bg-cream px-5 py-2 font-display text-5xl text-charcoal">{appearance.logoText}</div><h1 className="mb-3 font-display text-4xl leading-tight">Sua alimentação, sempre por perto.</h1><p className="text-primary-foreground/80">Acesse sua conta para acompanhar sua relação com a loja e comprar com mais facilidade.</p></div></section><section className="flex items-center justify-center p-6"><form onSubmit={submit} className="w-full max-w-sm space-y-5"><div><Link to="/" className="text-sm text-muted-foreground hover:text-primary">← Voltar para a loja</Link><h2 className="mt-5 font-display text-3xl">Área do cliente</h2><p className="mt-1 text-sm text-muted-foreground">Entre com seu e-mail cadastrado</p></div><div><Label htmlFor="email">E-mail</Label><Input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div><div><div className="flex items-center justify-between"><Label htmlFor="password">Senha</Label><Link to="/esqueci-senha" className="text-xs font-semibold text-primary-dark hover:underline">Esqueci minha senha</Link></div><Input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></div>{error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}<Button className="h-11 w-full rounded-full" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</Button><p className="text-center text-sm text-muted-foreground">Ainda não possui conta? <Link to="/cadastro" className="font-bold text-primary-dark hover:underline">Cadastre-se</Link></p></form></section></main>;
}
