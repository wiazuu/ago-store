import { createFileRoute } from "@tanstack/react-router";
import { useAdminStore } from "@/store/admin-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUploadField } from "@/components/admin/ImageUploadField";

export const Route = createFileRoute("/central-agons-92x/aparencia")({ component: AdminAparencia });

function AdminAparencia() {
  const app = useAdminStore((s) => s.appearance);
  const update = useAdminStore((s) => s.updateAppearance);
  const reset = useAdminStore((s) => s.resetAll);

  return (
    <div className="grid lg:grid-cols-2 gap-6 max-w-4xl">
      <div className="bg-card p-6 rounded-2xl brand-shadow space-y-4">
        <h2 className="font-display text-xl">Identidade</h2>
        <div>
          <Label>Nome da marca</Label>
          <Input value={app.brandName} onChange={(e) => update({ brandName: e.target.value })} />
        </div>
        <div>
          <Label>Slogan</Label>
          <Input value={app.slogan} onChange={(e) => update({ slogan: e.target.value })} />
        </div>
        <div>
          <Label>Logo (texto)</Label>
          <Input value={app.logoText} onChange={(e) => update({ logoText: e.target.value })} />
        </div>
        <ImageUploadField label="Logo (opcional)" value={app.logoUrl ?? ""} onChange={(logoUrl) => update({ logoUrl })} maxDimension={1000} />
        <ImageUploadField label="Favicon (opcional)" value={app.faviconUrl ?? ""} onChange={(faviconUrl) => update({ faviconUrl })} maxDimension={512} />
      </div>

      <div className="bg-card p-6 rounded-2xl brand-shadow space-y-4">
        <h2 className="font-display text-xl">Cores</h2>
        <p className="text-xs text-muted-foreground">
          Use HEX (como <code>#F5A623</code>) ou outra cor CSS válida. As alterações são aplicadas
          ao vivo.
        </p>
        <div>
          <Label>Cor primária</Label>
          <Input value={app.primary} onChange={(e) => update({ primary: e.target.value })} />
        </div>
        <div>
          <Label>Cor secundária</Label>
          <Input value={app.secondary} onChange={(e) => update({ secondary: e.target.value })} />
        </div>
        <div>
          <Label>Fundo</Label>
          <Input value={app.background} onChange={(e) => update({ background: e.target.value })} />
        </div>
        <div>
          <Label>Cor dos botões</Label>
          <Input
            value={app.buttonColor}
            onChange={(e) => update({ buttonColor: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2">
          {[app.primary, app.secondary, app.background, app.buttonColor].map((c, i) => (
            <div key={i} className="text-center">
              <div className="w-full aspect-square rounded-xl border" style={{ background: c }} />
              <div className="text-[10px] text-muted-foreground mt-1 truncate">
                {["Primária", "Secundária", "Fundo", "Botão"][i]}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card p-6 rounded-2xl brand-shadow space-y-4">
        <h2 className="font-display text-xl">Tipografia & forma</h2>
        <div>
          <Label>Fonte display</Label>
          <Input
            value={app.fontDisplay}
            onChange={(e) => update({ fontDisplay: e.target.value })}
          />
        </div>
        <div>
          <Label>Fonte corpo</Label>
          <Input value={app.fontSans} onChange={(e) => update({ fontSans: e.target.value })} />
        </div>
        <div>
          <Label>Raio das bordas (rem)</Label>
          <Input
            type="number"
            step="0.125"
            value={app.radius}
            onChange={(e) => update({ radius: e.target.value })}
          />
        </div>
        <div>
          <Label>Estilo dos botões</Label>
          <Select
            value={app.buttonStyle}
            onValueChange={(v) => update({ buttonStyle: v as "rounded" | "pill" | "square" })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rounded">Arredondado</SelectItem>
              <SelectItem value="pill">Pill</SelectItem>
              <SelectItem value="square">Quadrado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card p-6 rounded-2xl brand-shadow flex flex-col items-start gap-3">
        <h2 className="font-display text-xl">Resetar dados</h2>
        <p className="text-sm text-muted-foreground">
          Volta todos os dados administrativos para os valores iniciais.
        </p>
        <Button variant="outline" onClick={reset} className="rounded-full">
          Restaurar dados iniciais
        </Button>
      </div>
    </div>
  );
}
