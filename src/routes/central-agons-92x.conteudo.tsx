import { createFileRoute } from "@tanstack/react-router";
import { useAdminStore } from "@/store/admin-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/central-agons-92x/conteudo")({ component: AdminConteudo });

function AdminConteudo() {
  const inst = useAdminStore((s) => s.institutional);
  const update = useAdminStore((s) => s.updateInstitutional);

  return (
    <div className="grid lg:grid-cols-2 gap-6 max-w-5xl">
      <div className="bg-card p-6 rounded-2xl brand-shadow space-y-3">
        <h2 className="font-display text-xl">Institucional</h2>
        <div>
          <Label>Sobre a marca</Label>
          <Textarea
            rows={3}
            value={inst.about}
            onChange={(e) => update({ about: e.target.value })}
          />
        </div>
        <div>
          <Label>Como funciona</Label>
          <Textarea
            rows={2}
            value={inst.howItWorks}
            onChange={(e) => update({ howItWorks: e.target.value })}
          />
        </div>
        <div>
          <Label>Área de entrega</Label>
          <Textarea
            rows={2}
            value={inst.deliveryArea}
            onChange={(e) => update({ deliveryArea: e.target.value })}
          />
        </div>
        <div>
          <Label>Política de privacidade</Label>
          <Textarea
            rows={2}
            value={inst.privacy}
            onChange={(e) => update({ privacy: e.target.value })}
          />
        </div>
        <div>
          <Label>Termos de uso</Label>
          <Textarea
            rows={2}
            value={inst.terms}
            onChange={(e) => update({ terms: e.target.value })}
          />
        </div>
        <div>
          <Label>Formas de pagamento</Label>
          <Textarea
            rows={2}
            value={inst.paymentMethods}
            onChange={(e) => update({ paymentMethods: e.target.value })}
          />
        </div>
        <div>
          <Label>Frete grátis a partir de (R$)</Label>
          <Input
            type="number"
            value={inst.freeShippingMin}
            onChange={(e) => update({ freeShippingMin: +e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-card p-6 rounded-2xl brand-shadow space-y-3">
          <h2 className="font-display text-xl">Atendimento</h2>
          <div>
            <Label>E-mail</Label>
            <Input
              value={inst.support.email}
              onChange={(e) => update({ support: { ...inst.support, email: e.target.value } })}
            />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input
              value={inst.support.phone}
              onChange={(e) => update({ support: { ...inst.support, phone: e.target.value } })}
            />
          </div>
          <div>
            <Label>WhatsApp</Label>
            <Input
              value={inst.support.whatsapp}
              onChange={(e) => update({ support: { ...inst.support, whatsapp: e.target.value } })}
            />
          </div>
          <div>
            <Label>Horário</Label>
            <Input
              value={inst.support.hours}
              onChange={(e) => update({ support: { ...inst.support, hours: e.target.value } })}
            />
          </div>
        </div>

        <div className="bg-card p-6 rounded-2xl brand-shadow space-y-3">
          <h2 className="font-display text-xl">Redes sociais</h2>
          <div>
            <Label>Instagram</Label>
            <Input
              value={inst.socials.instagram}
              onChange={(e) => update({ socials: { ...inst.socials, instagram: e.target.value } })}
            />
          </div>
          <div>
            <Label>Facebook</Label>
            <Input
              value={inst.socials.facebook}
              onChange={(e) => update({ socials: { ...inst.socials, facebook: e.target.value } })}
            />
          </div>
          <div>
            <Label>TikTok</Label>
            <Input
              value={inst.socials.tiktok}
              onChange={(e) => update({ socials: { ...inst.socials, tiktok: e.target.value } })}
            />
          </div>
          <div>
            <Label>YouTube</Label>
            <Input
              value={inst.socials.youtube}
              onChange={(e) => update({ socials: { ...inst.socials, youtube: e.target.value } })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
