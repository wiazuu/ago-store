import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Eye, Plus, Trash2 } from "lucide-react";
import { useAdminStore } from "@/store/admin-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ImageUploadField } from "@/components/admin/ImageUploadField";

export const Route = createFileRoute("/central-agons-92x/home")({ component: AdminHome });

function AdminHome() {
  const home = useAdminStore((state) => state.home);
  const update = useAdminStore((state) => state.updateHome);

  const moveSection = (key: string, direction: -1 | 1) => {
    const sections = [...home.sections].sort((a, b) => a.order - b.order);
    const index = sections.findIndex((section) => section.key === key);
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    [sections[index].order, sections[target].order] = [sections[target].order, sections[index].order];
    update({ sections });
  };

  return (
    <div className="max-w-5xl space-y-6">
      <section className="ago-pattern rounded-3xl p-6 text-cream brand-shadow-lg">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div><p className="text-xs font-bold uppercase tracking-widest text-primary">Conteúdo público</p><h1 className="mt-2 font-display text-3xl">Página principal</h1><p className="mt-2 max-w-2xl text-sm text-cream/75">Campos vazios e seções desativadas não aparecem para o cliente. Publique somente informações reais.</p></div>
          <a href="/" target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-cream/25 px-5 text-sm font-bold hover:bg-cream hover:text-charcoal"><Eye className="h-4 w-4" /> Ver loja</a>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl bg-card p-6 brand-shadow">
        <h2 className="font-display text-xl">Barra promocional</h2>
        <div className="flex items-center gap-3"><Switch checked={home.promoBar.active} onCheckedChange={(active) => update({ promoBar: { ...home.promoBar, active } })} /><span className="text-sm">Ativa</span></div>
        <Field label="Texto"><Input value={home.promoBar.text} onChange={(event) => update({ promoBar: { ...home.promoBar, text: event.target.value } })} /></Field>
        <Field label="Link"><Input value={home.promoBar.link} onChange={(event) => update({ promoBar: { ...home.promoBar, link: event.target.value } })} /></Field>
      </section>

      <section className="space-y-4 rounded-2xl bg-card p-6 brand-shadow">
        <h2 className="font-display text-xl">Banner principal</h2>
        <Field label="Título"><Textarea value={home.hero.title} onChange={(event) => update({ hero: { ...home.hero, title: event.target.value } })} /></Field>
        <Field label="Subtítulo"><Textarea value={home.hero.subtitle} onChange={(event) => update({ hero: { ...home.hero, subtitle: event.target.value } })} /></Field>
        <ImageUploadField value={home.hero.image} onChange={(image) => update({ hero: { ...home.hero, image } })} />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Botão principal"><Input value={home.hero.ctaText} onChange={(event) => update({ hero: { ...home.hero, ctaText: event.target.value } })} /></Field>
          <Field label="Link principal"><Input value={home.hero.ctaLink} onChange={(event) => update({ hero: { ...home.hero, ctaLink: event.target.value } })} /></Field>
          <Field label="Botão secundário"><Input value={home.hero.ctaSecondaryText} onChange={(event) => update({ hero: { ...home.hero, ctaSecondaryText: event.target.value } })} /></Field>
          <Field label="Link secundário"><Input value={home.hero.ctaSecondaryLink} onChange={(event) => update({ hero: { ...home.hero, ctaSecondaryLink: event.target.value } })} /></Field>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl bg-card p-6 brand-shadow">
        <h2 className="font-display text-xl">Seções da página</h2>
        <p className="text-sm text-muted-foreground">Ative uma seção somente depois de preencher seu conteúdo.</p>
        {[...home.sections].sort((a, b) => a.order - b.order).map((section) => (
          <div key={section.key} className="flex items-center justify-between rounded-xl border p-3">
            <div className="flex items-center gap-3"><Switch checked={section.active} onCheckedChange={() => update({ sections: home.sections.map((item) => item.key === section.key ? { ...item, active: !item.active } : item) })} /><span className="font-medium">{section.label}</span></div>
            <div className="flex"><Button size="icon" variant="ghost" onClick={() => moveSection(section.key, -1)}><ArrowUp className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => moveSection(section.key, 1)}><ArrowDown className="h-4 w-4" /></Button></div>
          </div>
        ))}
      </section>

      <Collection title="Benefícios reais" description="Ex.: entrega e diferenciais que sua empresa realmente oferece." onAdd={() => update({ benefits: [...home.benefits, { id: crypto.randomUUID(), icon: "Sparkles", title: "", description: "" }] })}>
        {home.benefits.map((item, index) => <div key={item.id} className="grid gap-3 rounded-xl border p-3 md:grid-cols-[.7fr_1fr_1.6fr_auto]"><Input placeholder="Ícone: Truck" value={item.icon} onChange={(event) => update({ benefits: home.benefits.map((value, i) => i === index ? { ...value, icon: event.target.value } : value) })} /><Input placeholder="Título" value={item.title} onChange={(event) => update({ benefits: home.benefits.map((value, i) => i === index ? { ...value, title: event.target.value } : value) })} /><Input placeholder="Descrição" value={item.description} onChange={(event) => update({ benefits: home.benefits.map((value, i) => i === index ? { ...value, description: event.target.value } : value) })} /><DeleteButton label="Excluir benefício" onClick={() => update({ benefits: home.benefits.filter((_, i) => i !== index) })} /></div>)}
      </Collection>

      <Collection title="Como funciona" description="Cadastre somente etapas verdadeiras do atendimento." onAdd={() => update({ howItWorks: [...home.howItWorks, { id: crypto.randomUUID(), step: home.howItWorks.length + 1, icon: "Circle", title: "", description: "" }] })}>
        {home.howItWorks.map((item, index) => <div key={item.id} className="grid gap-3 rounded-xl border p-3 md:grid-cols-[80px_.7fr_1fr_1.5fr_auto]"><Input type="number" value={item.step} onChange={(event) => update({ howItWorks: home.howItWorks.map((value, i) => i === index ? { ...value, step: Number(event.target.value) } : value) })} /><Input placeholder="Ícone" value={item.icon} onChange={(event) => update({ howItWorks: home.howItWorks.map((value, i) => i === index ? { ...value, icon: event.target.value } : value) })} /><Input placeholder="Título" value={item.title} onChange={(event) => update({ howItWorks: home.howItWorks.map((value, i) => i === index ? { ...value, title: event.target.value } : value) })} /><Input placeholder="Descrição" value={item.description} onChange={(event) => update({ howItWorks: home.howItWorks.map((value, i) => i === index ? { ...value, description: event.target.value } : value) })} /><DeleteButton label="Excluir etapa" onClick={() => update({ howItWorks: home.howItWorks.filter((_, i) => i !== index) })} /></div>)}
      </Collection>

      <section className="space-y-4 rounded-2xl bg-card p-6 brand-shadow">
        <h2 className="font-display text-xl">Banner promocional do meio</h2>
        <div className="flex items-center gap-3"><Switch checked={home.midBanner.active} onCheckedChange={(active) => update({ midBanner: { ...home.midBanner, active } })} /><span className="text-sm">Ativo</span></div>
        <Field label="Título"><Input value={home.midBanner.title} onChange={(event) => update({ midBanner: { ...home.midBanner, title: event.target.value } })} /></Field>
        <Field label="Subtítulo"><Input value={home.midBanner.subtitle} onChange={(event) => update({ midBanner: { ...home.midBanner, subtitle: event.target.value } })} /></Field>
        <ImageUploadField value={home.midBanner.image} onChange={(image) => update({ midBanner: { ...home.midBanner, image } })} />
        <div className="grid gap-4 md:grid-cols-2"><Field label="Texto do botão"><Input value={home.midBanner.ctaText} onChange={(event) => update({ midBanner: { ...home.midBanner, ctaText: event.target.value } })} /></Field><Field label="Link do botão"><Input value={home.midBanner.ctaLink} onChange={(event) => update({ midBanner: { ...home.midBanner, ctaLink: event.target.value } })} /></Field></div>
      </section>

      <Collection title="Depoimentos" description="Publique apenas depoimentos reais e autorizados." onAdd={() => update({ testimonials: [...home.testimonials, { id: crypto.randomUUID(), name: "", role: "", text: "", rating: 5 }] })}>
        {home.testimonials.map((item, index) => <div key={item.id} className="space-y-3 rounded-xl border p-3"><div className="grid gap-3 md:grid-cols-[1fr_1fr_100px_auto]"><Input placeholder="Nome" value={item.name} onChange={(event) => update({ testimonials: home.testimonials.map((value, i) => i === index ? { ...value, name: event.target.value } : value) })} /><Input placeholder="Identificação" value={item.role} onChange={(event) => update({ testimonials: home.testimonials.map((value, i) => i === index ? { ...value, role: event.target.value } : value) })} /><Input type="number" min="1" max="5" value={item.rating} onChange={(event) => update({ testimonials: home.testimonials.map((value, i) => i === index ? { ...value, rating: Math.min(5, Math.max(1, Number(event.target.value))) } : value) })} /><DeleteButton label="Excluir depoimento" onClick={() => update({ testimonials: home.testimonials.filter((_, i) => i !== index) })} /></div><Textarea placeholder="Texto do depoimento" value={item.text} onChange={(event) => update({ testimonials: home.testimonials.map((value, i) => i === index ? { ...value, text: event.target.value } : value) })} /></div>)}
      </Collection>

      <section className="space-y-4 rounded-2xl bg-card p-6 brand-shadow">
        <h2 className="font-display text-xl">Sobre a marca</h2>
        <Field label="Título"><Input value={home.aboutShort.title} onChange={(event) => update({ aboutShort: { ...home.aboutShort, title: event.target.value } })} /></Field>
        <Field label="Texto"><Textarea rows={4} value={home.aboutShort.text} onChange={(event) => update({ aboutShort: { ...home.aboutShort, text: event.target.value } })} /></Field>
        <ImageUploadField value={home.aboutShort.image} onChange={(image) => update({ aboutShort: { ...home.aboutShort, image } })} />
      </section>

      <Collection title="Perguntas frequentes" description="Use respostas reais sobre entrega, conservação e atendimento." onAdd={() => update({ faq: [...home.faq, { id: crypto.randomUUID(), question: "", answer: "" }] })}>
        {home.faq.map((item, index) => <div key={item.id} className="space-y-3 rounded-xl border p-3"><div className="flex gap-2"><Input placeholder="Pergunta" value={item.question} onChange={(event) => update({ faq: home.faq.map((value, i) => i === index ? { ...value, question: event.target.value } : value) })} /><DeleteButton label="Excluir pergunta" onClick={() => update({ faq: home.faq.filter((_, i) => i !== index) })} /></div><Textarea placeholder="Resposta" value={item.answer} onChange={(event) => update({ faq: home.faq.map((value, i) => i === index ? { ...value, answer: event.target.value } : value) })} /></div>)}
      </Collection>

      <section className="space-y-4 rounded-2xl bg-card p-6 brand-shadow">
        <h2 className="font-display text-xl">SEO da página</h2>
        <Field label="Título para Google"><Input value={home.seoTitle} onChange={(event) => update({ seoTitle: event.target.value })} /></Field>
        <Field label="Descrição para Google"><Textarea value={home.seoDescription} onChange={(event) => update({ seoDescription: event.target.value })} /></Field>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

function Collection({ title, description, onAdd, children }: { title: string; description: string; onAdd: () => void; children: React.ReactNode }) {
  return <section className="space-y-4 rounded-2xl bg-card p-6 brand-shadow"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="font-display text-xl">{title}</h2><p className="text-xs text-muted-foreground">{description}</p></div><Button type="button" variant="outline" onClick={onAdd}><Plus className="h-4 w-4" /> Adicionar</Button></div>{children}</section>;
}

function DeleteButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <Button type="button" size="icon" variant="ghost" aria-label={label} onClick={onClick}><Trash2 className="h-4 w-4" /></Button>;
}
