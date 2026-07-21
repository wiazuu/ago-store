import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAdminStore } from "@/store/admin-store";
import type { Objective } from "@/data/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { ImageUploadField } from "@/components/admin/ImageUploadField";

export const Route = createFileRoute("/central-agons-92x/objetivos")({ component: AdminObjetivos });

const empty: Objective = {
  id: "",
  name: "",
  slug: "",
  description: "",
  icon: "Target",
  image: "",
  order: 99,
  active: true,
  productIds: [],
};

function AdminObjetivos() {
  const items = useAdminStore((s) => s.objectives).sort((a, b) => a.order - b.order);
  const upsert = useAdminStore((s) => s.upsertObjective);
  const del = useAdminStore((s) => s.deleteObjective);
  const [editing, setEditing] = useState<Objective | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing({ ...empty, id: `o${Date.now()}` });
            setOpen(true);
          }}
          className="rounded-full"
        >
          <Plus className="w-4 h-4" /> Novo objetivo
        </Button>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((o) => (
          <div key={o.id} className="bg-card rounded-2xl brand-shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-display text-lg">{o.name}</div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${o.active ? "bg-secondary/20 text-secondary" : "bg-muted text-muted-foreground"}`}
              >
                {o.active ? "Ativo" : "Inativo"}
              </span>
            </div>
            <div className="text-sm text-muted-foreground mb-2">{o.description}</div>
            <div className="text-xs text-muted-foreground mb-3">
              {o.productIds.length} produtos vinculados
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditing({ ...o });
                  setOpen(true);
                }}
              >
                <Pencil className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => del(o.id)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.name || "Novo objetivo"}</DialogTitle>
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
                <Label>Ícone (nome Lucide)</Label>
                <Input
                  value={editing.icon}
                  onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
                />
              </div>
              <ImageUploadField label="Banner" value={editing.image} onChange={(image) => setEditing({ ...editing, image })} />
              <div>
                <Label>Ordem</Label>
                <Input
                  type="number"
                  value={editing.order}
                  onChange={(e) => setEditing({ ...editing, order: +e.target.value })}
                />
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
