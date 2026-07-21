import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/central-agons-92x/esqueci-senha")({ component: ForgotPassword });
function ForgotPassword() {
  const [identity, setIdentity] = useState(""); const [message, setMessage] = useState(""); const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent) { event.preventDefault(); setLoading(true); const response = await fetch("/api/password-reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identity }) }); const data = (await response.json()) as { message?: string; error?: string }; setMessage(data.message || data.error || "Verifique seu e-mail."); setLoading(false); }
  return <main className="grid min-h-screen place-items-center bg-muted/40 px-4"><form onSubmit={submit} className="w-full max-w-md rounded-3xl border bg-card p-7 shadow-xl"><div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-primary/20 text-primary-dark"><Mail /></div><h1 className="font-display text-3xl">Recuperar acesso</h1><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Digite seu usuário ou e-mail administrativo. Se ele estiver cadastrado, enviaremos um link válido por 30 minutos.</p><div className="mt-6"><Label htmlFor="identity">Usuário ou e-mail</Label><Input id="identity" value={identity} onChange={(event) => setIdentity(event.target.value)} autoComplete="username" required /></div>{message && <p role="status" className="mt-4 rounded-xl bg-muted p-3 text-sm">{message}</p>}<Button className="mt-5 h-11 w-full" disabled={loading}>{loading ? "Enviando..." : "Enviar link seguro"}</Button><Link to="/central-agons-92x/entrar" className="mt-5 block text-center text-sm text-muted-foreground hover:text-primary">Voltar para o login</Link></form></main>;
}
