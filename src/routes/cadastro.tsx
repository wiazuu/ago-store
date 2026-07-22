import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useShopStore } from "@/store/shop-store";
export const Route = createFileRoute("/cadastro")({ component: RegisterPage });
function RegisterPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmation: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const setAuth = useShopStore((state) => state.setAuth);
  const navigate = useNavigate();
  const field = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (form.password !== form.confirmation) {
      setError("As senhas não são iguais.");
      return;
    }
    setLoading(true);
    const response = await fetch("/api/customer-register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
      }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) setError(data.error || "Não foi possível criar sua conta.");
    else {
      setAuth(true);
      navigate({ to: "/minha-conta" });
    }
    setLoading(false);
  }
  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 px-4 py-10">
      <form
        onSubmit={submit}
        className="w-full max-w-lg rounded-3xl border bg-card p-6 shadow-xl sm:p-8"
      >
        <Link to="/" className="text-sm text-muted-foreground">
          ← Voltar para a loja
        </Link>
        <h1 className="mt-5 font-display text-3xl">Criar conta</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cadastre-se para acessar os serviços da loja.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="name">Nome completo</Label>
            <Input
              id="name"
              autoComplete="name"
              value={form.name}
              onChange={(e) => field("name", e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => field("email", e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="phone">Celular/WhatsApp</Label>
            <Input
              id="phone"
              type="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={(e) => field("phone", e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              value={form.password}
              onChange={(e) => field("password", e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="confirmation">Confirmar senha</Label>
            <Input
              id="confirmation"
              type="password"
              autoComplete="new-password"
              minLength={12}
              value={form.confirmation}
              onChange={(e) => field("confirmation", e.target.value)}
              required
            />
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Use 12 ou mais caracteres, incluindo maiúscula, minúscula e número.
        </p>
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        <Button className="mt-5 h-11 w-full" disabled={loading}>
          {loading ? "Criando conta..." : "Criar minha conta"}
        </Button>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          Já possui cadastro?{" "}
          <Link to="/login" className="font-bold text-primary-dark">
            Entrar
          </Link>
        </p>
      </form>
    </main>
  );
}
