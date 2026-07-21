import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAdminStore } from "@/store/admin-store";
import type { Coupon } from "@/data/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { brl } from "@/lib/format";
import { Plus, Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/central-agons-92x/cupons")({ component: AdminCupons });

const empty: Coupon = {
  id: "",
  code: "",
  type: "percent",
  value: 10,
  validUntil: "2026-12-31",
  minSubtotal: 0,
  usageLimit: 100,
  used: 0,
  active: true,
};

function AdminCupons() {
  const items = useAdminStore((s) => s.coupons);
  const upsert = useAdminStore((s) => s.upsertCoupon);
  const del = useAdminStore((s) => s.deleteCoupon);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing({ ...empty, id: `cp${Date.now()}` });
            setOpen(true);
          }}
          className="rounded-full"
        >
          <Plus className="w-4 h-4" /> Novo cupom
        </Button>
      </div>
      <div className="bg-card rounded-2xl brand-shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left p-3">Código</th>
              <th className="text-left p-3">Tipo</th>
              <th className="text-right p-3">Valor</th>
              <th className="text-right p-3">Mínimo</th>
              <th className="text-center p-3">Usos</th>
              <th className="text-center p-3">Ativo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-3 font-mono font-medium">{c.code}</td>
                <td className="p-3">{c.type}</td>
                <td className="p-3 text-right">
                  {c.type === "percent" ? `${c.value}%` : brl(c.value)}
                </td>
                <td className="p-3 text-right">{brl(c.minSubtotal)}</td>
                <td className="p-3 text-center">
                  {c.used}/{c.usageLimit}
                </td>
                <td className="p-3 text-center">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${c.active ? "bg-secondary/20 text-secondary" : "bg-muted text-muted-foreground"}`}
                  >
                    {c.active ? "Sim" : "Não"}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setEditing({ ...c });
                      setOpen(true);
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => del(c.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.code || "Novo cupom"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Código</Label>
                <Input
                  value={editing.code}
                  onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })}
                />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select
                  value={editing.type}
                  onValueChange={(v) => setEditing({ ...editing, type: v as Coupon["type"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentual</SelectItem>
                    <SelectItem value="fixed">Valor fixo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Valor</Label>
                  <Input
                    type="number"
                    value={editing.value}
                    onChange={(e) => setEditing({ ...editing, value: +e.target.value })}
                  />
                </div>
                <div>
                  <Label>Mínimo</Label>
                  <Input
                    type="number"
                    value={editing.minSubtotal}
                    onChange={(e) => setEditing({ ...editing, minSubtotal: +e.target.value })}
                  />
                </div>
                <div>
                  <Label>Validade</Label>
                  <Input
                    type="date"
                    value={editing.validUntil}
                    onChange={(e) => setEditing({ ...editing, validUntil: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Limite de uso</Label>
                  <Input
                    type="number"
                    value={editing.usageLimit}
                    onChange={(e) => setEditing({ ...editing, usageLimit: +e.target.value })}
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
                    upsert(editing);
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
