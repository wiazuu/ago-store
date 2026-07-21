import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAdminStore } from "@/store/admin-store";
import type { Product } from "@/data/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { brl } from "@/lib/format";
import { Plus, Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/central-agons-92x/produtos")({ component: AdminProducts });

const empty: Product = {
  id: "",
  name: "",
  slug: "",
  categoryId: "c1",
  objectiveIds: [],
  image: "",
  gallery: [],
  shortDescription: "",
  description: "",
  price: 0,
  stock: 0,
  weightG: 350,
  calories: 400,
  protein: 25,
  carbs: 40,
  fats: 12,
  ingredients: "",
  allergens: "",
  preparation: "",
  validity: "6 meses",
  storage: "Congelado -18°C",
  tags: [],
  badge: "",
  active: true,
  featured: false,
  isNew: false,
  bestSeller: false,
};

function AdminProducts() {
  const products = useAdminStore((s) => s.products);
  const categories = useAdminStore((s) => s.categories);
  const upsert = useAdminStore((s) => s.upsertProduct);
  const del = useAdminStore((s) => s.deleteProduct);
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const filtered = products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));

  const openNew = () => {
    setEditing({ ...empty, id: `p${Date.now()}` });
    setOpen(true);
  };
  const openEdit = (p: Product) => {
    setEditing({ ...p });
    setOpen(true);
  };
  const save = () => {
    if (!editing) return;
    upsert({ ...editing, slug: editing.slug || editing.name.toLowerCase().replace(/\s+/g, "-") });
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          placeholder="Buscar produtos..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        <Button onClick={openNew} className="rounded-full">
          <Plus className="w-4 h-4" /> Novo produto
        </Button>
      </div>

      <div className="bg-card rounded-2xl brand-shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left p-3">Produto</th>
              <th className="text-left p-3">Categoria</th>
              <th className="text-right p-3">Preço</th>
              <th className="text-center p-3">Estoque</th>
              <th className="text-center p-3">Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3 flex items-center gap-3">
                  <img src={p.image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.slug}</div>
                  </div>
                </td>
                <td className="p-3">{categories.find((c) => c.id === p.categoryId)?.name}</td>
                <td className="p-3 text-right">{brl(p.price)}</td>
                <td className="p-3 text-center">{p.stock}</td>
                <td className="p-3 text-center">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${p.active ? "bg-secondary/20 text-secondary" : "bg-muted text-muted-foreground"}`}
                  >
                    {p.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => del(p.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.name ? "Editar produto" : "Novo produto"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <Label>Nome</Label>
                  <Input
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Slug</Label>
                  <Input
                    value={editing.slug}
                    onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select
                    value={editing.categoryId}
                    onValueChange={(v) => setEditing({ ...editing, categoryId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Imagem (URL)</Label>
                  <Input
                    value={editing.image}
                    onChange={(e) => setEditing({ ...editing, image: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Preço</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editing.price}
                    onChange={(e) => setEditing({ ...editing, price: +e.target.value })}
                  />
                </div>
                <div>
                  <Label>Preço promocional</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editing.promoPrice ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        promoPrice: e.target.value ? +e.target.value : undefined,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Estoque</Label>
                  <Input
                    type="number"
                    value={editing.stock}
                    onChange={(e) => setEditing({ ...editing, stock: +e.target.value })}
                  />
                </div>
                <div>
                  <Label>Peso (g)</Label>
                  <Input
                    type="number"
                    value={editing.weightG}
                    onChange={(e) => setEditing({ ...editing, weightG: +e.target.value })}
                  />
                </div>
                <div>
                  <Label>Calorias</Label>
                  <Input
                    type="number"
                    value={editing.calories}
                    onChange={(e) => setEditing({ ...editing, calories: +e.target.value })}
                  />
                </div>
                <div>
                  <Label>Proteína (g)</Label>
                  <Input
                    type="number"
                    value={editing.protein}
                    onChange={(e) => setEditing({ ...editing, protein: +e.target.value })}
                  />
                </div>
                <div>
                  <Label>Carboidratos (g)</Label>
                  <Input
                    type="number"
                    value={editing.carbs}
                    onChange={(e) => setEditing({ ...editing, carbs: +e.target.value })}
                  />
                </div>
                <div>
                  <Label>Gorduras (g)</Label>
                  <Input
                    type="number"
                    value={editing.fats}
                    onChange={(e) => setEditing({ ...editing, fats: +e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Descrição curta</Label>
                <Input
                  value={editing.shortDescription}
                  onChange={(e) => setEditing({ ...editing, shortDescription: e.target.value })}
                />
              </div>
              <div>
                <Label>Descrição completa</Label>
                <Textarea
                  rows={3}
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </div>
              <div>
                <Label>Ingredientes</Label>
                <Textarea
                  rows={2}
                  value={editing.ingredients}
                  onChange={(e) => setEditing({ ...editing, ingredients: e.target.value })}
                />
              </div>
              <div>
                <Label>Alérgenos</Label>
                <Input
                  value={editing.allergens}
                  onChange={(e) => setEditing({ ...editing, allergens: e.target.value })}
                />
              </div>
              <div>
                <Label>Tags (separadas por vírgula)</Label>
                <Input
                  value={editing.tags.join(", ")}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      tags: e.target.value
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                <label className="flex items-center gap-2">
                  <Switch
                    checked={editing.active}
                    onCheckedChange={(v) => setEditing({ ...editing, active: v })}
                  />{" "}
                  Ativo
                </label>
                <label className="flex items-center gap-2">
                  <Switch
                    checked={editing.featured}
                    onCheckedChange={(v) => setEditing({ ...editing, featured: v })}
                  />{" "}
                  Destaque
                </label>
                <label className="flex items-center gap-2">
                  <Switch
                    checked={editing.isNew}
                    onCheckedChange={(v) => setEditing({ ...editing, isNew: v })}
                  />{" "}
                  Lançamento
                </label>
                <label className="flex items-center gap-2">
                  <Switch
                    checked={editing.bestSeller}
                    onCheckedChange={(v) => setEditing({ ...editing, bestSeller: v })}
                  />{" "}
                  Mais vendido
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={save}>Salvar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
