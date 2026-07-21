import { createFileRoute } from "@tanstack/react-router";
import { useAdminStore } from "@/store/admin-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ArrowDown, ArrowUp, Eye, MessageCircle, Radio } from "lucide-react";

export const Route = createFileRoute("/central-agons-92x/home")({ component: AdminHome });

function AdminHome() {
  const home = useAdminStore((s) => s.home);
  const update = useAdminStore((s) => s.updateHome);

  const moveSection = (key: string, dir: -1 | 1) => {
    const sections = [...home.sections].sort((a, b) => a.order - b.order);
    const idx = sections.findIndex((s) => s.key === key);
    const j = idx + dir;
    if (j < 0 || j >= sections.length) return;
    [sections[idx].order, sections[j].order] = [sections[j].order, sections[idx].order];
    update({ sections });
  };
  const toggleSection = (key: string) =>
    update({
      sections: home.sections.map((s) => (s.key === key ? { ...s, active: !s.active } : s)),
    });

  return (
    <div className="max-w-5xl space-y-6">
      <section className="ago-pattern overflow-hidden rounded-3xl p-5 text-cream brand-shadow-lg sm:p-7">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <div className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.15em] text-primary">
              <Radio className="h-4 w-4" /> Comunicação com seus clientes
            </div>
            <h1 className="font-display text-3xl sm:text-4xl">Página principal da loja</h1>
            <p className="mt-2 text-sm leading-relaxed text-cream/75 sm:text-base">
              Ajuste ofertas, mensagens e destaques. Quando terminar, use “Publicar loja” no topo;
              celulares e computadores recebem a nova versão automaticamente.
            </p>
          </div>
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-cream/25 px-5 text-sm font-bold hover:bg-cream hover:text-charcoal"
          >
            <Eye className="h-4 w-4" /> Ver como cliente
          </a>
        </div>

        <div className="mt-6 grid gap-2 text-xs sm:grid-cols-3">
          <div className="rounded-2xl bg-cream/10 p-3">
            <strong className="block text-primary">1. Edite</strong>
            As mudanças ficam como rascunho no painel.
          </div>
          <div className="rounded-2xl bg-cream/10 p-3">
            <strong className="block text-primary">2. Publique</strong>
            Um clique envia a versão para a loja.
          </div>
          <div className="rounded-2xl bg-cream/10 p-3">
            <strong className="block text-primary">3. Comunique</strong>
            Clientes recebem a atualização em poucos segundos.
          </div>
        </div>
      </section>

      <div className="bg-card p-6 rounded-2xl brand-shadow space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-soft text-secondary">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-xl">Barra promocional</h2>
            <p className="text-xs text-muted-foreground">Mensagem curta exibida no topo da loja.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Switch
            checked={home.promoBar.active}
            onCheckedChange={(v) => update({ promoBar: { ...home.promoBar, active: v } })}
          />
          <span className="text-sm">Ativa</span>
        </div>
        <div>
          <Label>Texto</Label>
          <Input
            value={home.promoBar.text}
            onChange={(e) => update({ promoBar: { ...home.promoBar, text: e.target.value } })}
          />
        </div>
        <div>
          <Label>Link</Label>
          <Input
            value={home.promoBar.link}
            onChange={(e) => update({ promoBar: { ...home.promoBar, link: e.target.value } })}
          />
        </div>
      </div>

      <div className="bg-card p-6 rounded-2xl brand-shadow space-y-4">
        <h2 className="font-display text-xl">Banner principal (Hero)</h2>
        <div>
          <Label>Título (use \n para quebra)</Label>
          <Textarea
            value={home.hero.title}
            onChange={(e) => update({ hero: { ...home.hero, title: e.target.value } })}
          />
        </div>
        <div>
          <Label>Subtítulo</Label>
          <Textarea
            value={home.hero.subtitle}
            onChange={(e) => update({ hero: { ...home.hero, subtitle: e.target.value } })}
          />
        </div>
        <div>
          <Label>Imagem (URL)</Label>
          <Input
            value={home.hero.image}
            onChange={(e) => update({ hero: { ...home.hero, image: e.target.value } })}
          />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Botão principal</Label>
            <Input
              value={home.hero.ctaText}
              onChange={(e) => update({ hero: { ...home.hero, ctaText: e.target.value } })}
            />
          </div>
          <div>
            <Label>Link principal</Label>
            <Input
              value={home.hero.ctaLink}
              onChange={(e) => update({ hero: { ...home.hero, ctaLink: e.target.value } })}
            />
          </div>
          <div>
            <Label>Botão secundário</Label>
            <Input
              value={home.hero.ctaSecondaryText}
              onChange={(e) => update({ hero: { ...home.hero, ctaSecondaryText: e.target.value } })}
            />
          </div>
          <div>
            <Label>Link secundário</Label>
            <Input
              value={home.hero.ctaSecondaryLink}
              onChange={(e) => update({ hero: { ...home.hero, ctaSecondaryLink: e.target.value } })}
            />
          </div>
        </div>
      </div>

      <div className="bg-card p-6 rounded-2xl brand-shadow space-y-3">
        <h2 className="font-display text-xl">Seções da home</h2>
        <p className="text-sm text-muted-foreground">
          Ative, desative e reordene as seções da home.
        </p>
        <div className="space-y-2">
          {[...home.sections]
            .sort((a, b) => a.order - b.order)
            .map((s) => (
              <div key={s.key} className="flex items-center justify-between border rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <Switch checked={s.active} onCheckedChange={() => toggleSection(s.key)} />
                  <span className="font-medium">{s.label}</span>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => moveSection(s.key, -1)}>
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => moveSection(s.key, 1)}>
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
        </div>
      </div>

      <div className="bg-card p-6 rounded-2xl brand-shadow space-y-4">
        <h2 className="font-display text-xl">Banner promocional (meio)</h2>
        <div className="flex items-center gap-3">
          <Switch
            checked={home.midBanner.active}
            onCheckedChange={(v) => update({ midBanner: { ...home.midBanner, active: v } })}
          />
          <span className="text-sm">Ativo</span>
        </div>
        <div>
          <Label>Título</Label>
          <Input
            value={home.midBanner.title}
            onChange={(e) => update({ midBanner: { ...home.midBanner, title: e.target.value } })}
          />
        </div>
        <div>
          <Label>Subtítulo</Label>
          <Input
            value={home.midBanner.subtitle}
            onChange={(e) => update({ midBanner: { ...home.midBanner, subtitle: e.target.value } })}
          />
        </div>
      </div>

      <div className="bg-card p-6 rounded-2xl brand-shadow space-y-4">
        <h2 className="font-display text-xl">Sobre a marca</h2>
        <div>
          <Label>Título</Label>
          <Input
            value={home.aboutShort.title}
            onChange={(e) => update({ aboutShort: { ...home.aboutShort, title: e.target.value } })}
          />
        </div>
        <div>
          <Label>Texto</Label>
          <Textarea
            rows={4}
            value={home.aboutShort.text}
            onChange={(e) => update({ aboutShort: { ...home.aboutShort, text: e.target.value } })}
          />
        </div>
      </div>

      <div className="bg-card p-6 rounded-2xl brand-shadow space-y-4">
        <h2 className="font-display text-xl">SEO da home</h2>
        <div>
          <Label>Title</Label>
          <Input value={home.seoTitle} onChange={(e) => update({ seoTitle: e.target.value })} />
        </div>
        <div>
          <Label>Meta description</Label>
          <Textarea
            value={home.seoDescription}
            onChange={(e) => update({ seoDescription: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
