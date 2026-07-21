import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAdminStore } from "@/store/admin-store";
import type { Kit } from "@/data/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { brl } from "@/lib/format";
import { Plus, Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/central-agons-92x/kits")({ component: AdminKits });

const empty: Kit = {
  id: "",
  name: "",
  slug: "",
  description: "",
  image: "",
  items: [],
  price: 0,
  discountPct: 10,
  active: true,
};

function AdminKits() {
  const items = useAdminStore((s) => s.kits);
  const upsert = useAdminStore((s) => s.upsertKit);
  const del = useAdminStore((s) => s.deleteKit);
  const [editing, setEditing] = useState<Kit | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing({ ...empty, id: `k${Date.now()}` });
            setOpen(true);
          }}
          className="rounded-full"
        >
          <Plus className="w-4 h-4" /> Novo kit
        </Button>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((k) => (
          <div key={k.id} className="bg-card rounded-2xl brand-shadow overflow-hidden">
            <div className="aspect-video">
              <img src={k.image} alt={k.name} className="w-full h-full object-cover" />
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-1">
                <div className="font-display text-lg">{k.name}</div>
                <div className="font-medium">{brl(k.price)}</div>
              </div>
              <div className="text-sm text-muted-foreground mb-3">
                {k.items.length} itens · -{k.discountPct}%
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditing({ ...k });
                    setOpen(true);
                  }}
                >
                  <Pencil className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => del(k.id)}>
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
            <DialogTitle>{editing?.name || "Novo kit"}</DialogTitle>
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
                <Label>Descrição</Label>
                <Textarea
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </div>
              <div>
                <Label>Imagem</Label>
                <Input
                  value={editing.image}
                  onChange={(e) => setEditing({ ...editing, image: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
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
                  <Label>Desconto %</Label>
                  <Input
                    type="number"
                    value={editing.discountPct}
                    onChange={(e) => setEditing({ ...editing, discountPct: +e.target.value })}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2">
                <Switch
                  checked={editing.active}
                  onCheckedChange={(v) => setEditing({ ...editing, active: v })}
                />{" "}
                Ativo
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
