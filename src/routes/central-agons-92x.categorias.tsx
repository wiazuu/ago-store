import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAdminStore } from "@/store/admin-store";
import type { Category } from "@/data/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/central-agons-92x/categorias")({ component: AdminCategorias });

const empty: Category = {
  id: "",
  name: "",
  slug: "",
  description: "",
  image: "",
  color: "oklch(0.79 0.15 75)",
  order: 99,
  active: true,
};

function AdminCategorias() {
  const items = useAdminStore((s) => s.categories).sort((a, b) => a.order - b.order);
  const upsert = useAdminStore((s) => s.upsertCategory);
  const del = useAdminStore((s) => s.deleteCategory);
  const [editing, setEditing] = useState<Category | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing({ ...empty, id: `c${Date.now()}` });
            setOpen(true);
          }}
          className="rounded-full"
        >
          <Plus className="w-4 h-4" /> Nova categoria
        </Button>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((c) => (
          <div key={c.id} className="bg-card rounded-2xl brand-shadow overflow-hidden">
            <div className="aspect-video">
              <img src={c.image} alt={c.name} className="w-full h-full object-cover" />
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-display text-lg">{c.name}</div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${c.active ? "bg-secondary/20 text-secondary" : "bg-muted text-muted-foreground"}`}
                >
                  {c.active ? "Ativa" : "Inativa"}
                </span>
              </div>
              <div className="text-sm text-muted-foreground mb-3">{c.description}</div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditing({ ...c });
                    setOpen(true);
                  }}
                >
                  <Pencil className="w-3 h-3" /> Editar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => del(c.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.name || "Nova categoria"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
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
                <Label>Descrição</Label>
                <Textarea
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </div>
              <div>
                <Label>Imagem (URL)</Label>
                <Input
                  value={editing.image}
                  onChange={(e) => setEditing({ ...editing, image: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Ordem</Label>
                  <Input
                    type="number"
                    value={editing.order}
                    onChange={(e) => setEditing({ ...editing, order: +e.target.value })}
                  />
                </div>
                <div>
                  <Label>Cor</Label>
                  <Input
                    value={editing.color}
                    onChange={(e) => setEditing({ ...editing, color: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Texto SEO</Label>
                <Textarea
                  value={editing.seoText ?? ""}
                  onChange={(e) => setEditing({ ...editing, seoText: e.target.value })}
                />
              </div>
              <label className="flex items-center gap-2">
                <Switch
                  checked={editing.active}
                  onCheckedChange={(v) => setEditing({ ...editing, active: v })}
                />{" "}
                Ativa
              </label>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    upsert({
                      ...editing,
                      slug: editing.slug || editing.name.toLowerCase().replace(/\s+/g, "-"),
                    });
                    setOpen(false);
                  }}
                >
                  Salvar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
