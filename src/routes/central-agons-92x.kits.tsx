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
import { ImageUploadField } from "@/components/admin/ImageUploadField";

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
  customizable: true,
  mealCount: 7,
  subscriptionEligible: true,
  planInterval: "weekly",
  durationWeeks: 1,
  mealsPerWeek: 7,
  maxVarieties: 3,
};

function AdminKits() {
  const items = useAdminStore((s) => s.kits);
  const products = useAdminStore((s) => s.products);
  const upsert = useAdminStore((s) => s.upsertKit);
  const del = useAdminStore((s) => s.deleteKit);
  const [editing, setEditing] = useState<Kit | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
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
              <div className="mb-2 inline-flex rounded-full bg-secondary/10 px-2.5 py-1 text-xs font-bold text-secondary">
                {k.durationWeeks || 1} semana(s) · {k.mealsPerWeek || k.mealCount || 7} refeições
                por semana
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
              <ImageUploadField
                value={editing.image}
                onChange={(image) => setEditing({ ...editing, image })}
              />
              <div>
                <Label>Duração do kit</Label>
                <select
                  className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={editing.planInterval || "weekly"}
                  onChange={(event) => {
                    const interval = event.target.value as "weekly" | "monthly" | "quarterly";
                    const durationWeeks =
                      interval === "weekly" ? 1 : interval === "monthly" ? 4 : 12;
                    setEditing({
                      ...editing,
                      planCode: undefined,
                      planInterval: interval,
                      durationWeeks,
                      mealsPerWeek: 7,
                      mealCount: 7,
                      maxVarieties: 3,
                      subscriptionEligible: true,
                      customizable: true,
                    });
                  }}
                >
                  <option value="weekly">Semanal · 7 refeições</option>
                  <option value="monthly">Mensal · 28 refeições</option>
                  <option value="quarterly">Trimestral · 84 refeições</option>
                </select>
                <p className="mt-1 text-xs text-muted-foreground">
                  Cada entrega possui 7 refeições e aceita até 3 sabores.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Refeições por semana</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={editing.mealCount || 1}
                    disabled={Boolean(editing.planInterval)}
                    onChange={(e) => setEditing({ ...editing, mealCount: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2 pt-6">
                  <label className="flex items-center gap-2">
                    <Switch
                      checked={editing.customizable ?? true}
                      onCheckedChange={(value) => setEditing({ ...editing, customizable: value })}
                    />
                    Cliente escolhe os pratos
                  </label>
                  <label className="flex items-center gap-2">
                    <Switch
                      checked={editing.subscriptionEligible ?? true}
                      onCheckedChange={(value) =>
                        setEditing({ ...editing, subscriptionEligible: value })
                      }
                    />
                    Disponível para assinatura
                  </label>
                </div>
              </div>
              <div>
                <Label>Pratos permitidos no kit</Label>
                <div className="mt-2 max-h-52 space-y-2 overflow-y-auto rounded-xl border p-3">
                  {products
                    .filter((product) => product.active)
                    .map((product) => {
                      const selected = editing.items.some((item) => item.productId === product.id);
                      return (
                        <label key={product.id} className="flex items-center gap-3 text-sm">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={(e) =>
                              setEditing({
                                ...editing,
                                items: e.target.checked
                                  ? [...editing.items, { productId: product.id, qty: 1 }]
                                  : editing.items.filter((item) => item.productId !== product.id),
                              })
                            }
                          />
                          <span className="flex-1">{product.name}</span>
                        </label>
                      );
                    })}
                  {products.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Cadastre refeições antes de montar o kit.
                    </p>
                  )}
                </div>
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
