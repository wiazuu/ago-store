import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import type { EmporiumInput, EmporiumProduct } from "@/lib/emporium.server";

export const Route = createFileRoute("/central-agons-92x/emporio")({ component: AdminEmporium });
const empty: EmporiumInput = { name: "", slug: "", category: "", shortDescription: "", description: "", image: "", priceCents: 0, stock: 0, active: true, featured: false };
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function AdminEmporium() {
  const [products, setProducts] = useState<EmporiumProduct[]>([]);
  const [form, setForm] = useState<EmporiumInput>(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const csrf = () => sessionStorage.getItem("ago-admin-csrf") || "";
  const load = useCallback(async () => { const response = await fetch("/api/emporio", { cache: "no-store" }); const data = (await response.json()) as { products?: EmporiumProduct[] }; setProducts(data.products || []); }, []);
  useEffect(() => { void load(); }, [load]);
  const field = <K extends keyof EmporiumInput>(key: K, value: EmporiumInput[K]) => setForm((current) => ({ ...current, [key]: value }));
  const reset = () => { setForm(empty); setEditingId(null); setMessage(""); };
  const edit = (product: EmporiumProduct) => { const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...input } = product; setForm(input); setEditingId(product.id); window.scrollTo({ top: 0, behavior: "smooth" }); };

  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    const response = await fetch(editingId ? `/api/emporio/${editingId}` : "/api/emporio", { method: editingId ? "PUT" : "POST", headers: { "Content-Type": "application/json", "x-csrf-token": csrf() }, body: JSON.stringify(form) });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) setMessage(data.error || "Não foi possível salvar.");
    else { reset(); await load(); setMessage("Produto salvo no banco e publicado no Empório."); }
    setBusy(false);
  }

  async function remove(product: EmporiumProduct) {
    if (!confirm(`Excluir ${product.name}?`)) return;
    const response = await fetch(`/api/emporio/${product.id}`, { method: "DELETE", headers: { "x-csrf-token": csrf() } });
    if (response.ok) await load(); else setMessage("Não foi possível excluir o produto.");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="section-kicker">Catálogo complementar</p><h1 className="font-display text-3xl sm:text-4xl">Empório</h1><p className="mt-2 text-sm text-muted-foreground">Produtos separados das refeições, salvos diretamente no PostgreSQL.</p></div><Button variant="outline" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Atualizar lista</Button></header>
      <form onSubmit={save} className="rounded-3xl border bg-card p-5 shadow-sm sm:p-7">
        <div className="mb-5 flex items-center justify-between"><h2 className="font-display text-2xl">{editingId ? "Editar produto" : "Novo produto"}</h2>{editingId && <Button type="button" variant="ghost" onClick={reset}>Cancelar edição</Button>}</div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div><Label>Nome</Label><Input value={form.name} onChange={(event) => { field("name", event.target.value); if (!editingId) field("slug", event.target.value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")); }} required /></div>
          <div><Label>Endereço amigável</Label><Input value={form.slug} onChange={(event) => field("slug", event.target.value)} required /></div>
          <div><Label>Categoria</Label><Input value={form.category} onChange={(event) => field("category", event.target.value)} required /></div>
          <div><Label>Preço (R$)</Label><Input type="number" min="0.50" step="0.01" value={form.priceCents ? form.priceCents / 100 : ""} onChange={(event) => field("priceCents", Math.round(Number(event.target.value) * 100))} required /></div>
          <div><Label>Estoque</Label><Input type="number" min="0" step="1" value={form.stock} onChange={(event) => field("stock", Number(event.target.value))} required /></div>
          <div className="sm:col-span-2 lg:col-span-3"><ImageUploadField value={form.image} onChange={(image) => field("image", image)} /></div>
          <div className="sm:col-span-2 lg:col-span-3"><Label>Resumo do card</Label><Input value={form.shortDescription} onChange={(event) => field("shortDescription", event.target.value)} maxLength={240} required /></div>
          <div className="sm:col-span-2 lg:col-span-3"><Label>Descrição completa</Label><Textarea value={form.description} onChange={(event) => field("description", event.target.value)} rows={4} required /></div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-6"><label className="flex items-center gap-2 text-sm font-semibold"><Switch checked={form.active} onCheckedChange={(value) => field("active", value)} />Visível na loja</label><label className="flex items-center gap-2 text-sm font-semibold"><Switch checked={form.featured} onCheckedChange={(value) => field("featured", value)} />Destaque</label><Button className="ml-auto" disabled={busy}><Plus className="mr-2 h-4 w-4" />{busy ? "Salvando..." : editingId ? "Salvar edição" : "Cadastrar produto"}</Button></div>
        {message && <p className="mt-4 rounded-xl bg-muted p-3 text-sm">{message}</p>}
      </form>
      <section><h2 className="mb-4 font-display text-2xl">Produtos cadastrados ({products.length})</h2><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{products.map((product) => <article key={product.id} className="flex gap-4 rounded-2xl border bg-card p-4"><img src={product.image} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" /><div className="min-w-0 flex-1"><h3 className="truncate font-bold">{product.name}</h3><p className="text-xs text-muted-foreground">{product.category} · {money.format(product.priceCents / 100)} · estoque {product.stock}</p><div className="mt-3 flex gap-2"><Button size="sm" variant="outline" onClick={() => edit(product)}><Pencil className="mr-1 h-3.5 w-3.5" />Editar</Button><Button size="sm" variant="ghost" className="text-destructive" onClick={() => void remove(product)}><Trash2 className="mr-1 h-3.5 w-3.5" />Excluir</Button></div></div></article>)}</div></section>
    </div>
  );
}
