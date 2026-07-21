import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAdminStore } from "@/store/admin-store";
import type { Banner } from "@/data/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/central-agons-92x/banners")({ component: AdminBanners });

const empty: Banner = {
  id: "",
  location: "home-hero",
  title: "",
  subtitle: "",
  image: "",
  link: "/",
  ctaText: "Ver mais",
  active: true,
  order: 99,
};

function AdminBanners() {
  const items = useAdminStore((s) => s.banners);
  const upsert = useAdminStore((s) => s.upsertBanner);
  const del = useAdminStore((s) => s.deleteBanner);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing({ ...empty, id: `b${Date.now()}` });
            setOpen(true);
          }}
          className="rounded-full"
        >
          <Plus className="w-4 h-4" /> Novo banner
        </Button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {items.map((b) => (
          <div key={b.id} className="bg-card rounded-2xl brand-shadow overflow-hidden">
            <div className="aspect-[16/9]">
              <img src={b.image} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="p-4">
              <div className="text-xs text-muted-foreground uppercase mb-1">{b.location}</div>
              <div className="font-display text-lg">{b.title}</div>
              <div className="text-sm text-muted-foreground mb-3">{b.subtitle}</div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditing({ ...b });
                    setOpen(true);
                  }}
                >
                  <Pencil className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => del(b.id)}>
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
            <DialogTitle>{editing?.title || "Novo banner"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Local</Label>
                <Input
                  value={editing.location}
                  onChange={(e) =>
                    setEditing({ ...editing, location: e.target.value as Banner["location"] })
                  }
                />
              </div>
              <div>
                <Label>Título</Label>
                <Input
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                />
              </div>
              <div>
                <Label>Subtítulo</Label>
                <Input
                  value={editing.subtitle}
                  onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })}
                />
              </div>
              <div>
                <Label>Imagem</Label>
                <Input
                  value={editing.image}
                  onChange={(e) => setEditing({ ...editing, image: e.target.value })}
                />
              </div>
              <div>
                <Label>Link</Label>
                <Input
                  value={editing.link}
                  onChange={(e) => setEditing({ ...editing, link: e.target.value })}
                />
              </div>
              <div>
                <Label>Texto do botão</Label>
                <Input
                  value={editing.ctaText}
                  onChange={(e) => setEditing({ ...editing, ctaText: e.target.value })}
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
