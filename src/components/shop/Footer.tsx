import { Link } from "@tanstack/react-router";
import {
  CreditCard,
  Facebook,
  Instagram,
  MessageCircle,
  QrCode,
  ShieldCheck,
  Youtube,
} from "lucide-react";
import { useAppearance, useCategories, useInstitutional } from "@/store/admin-store";
import { BrandLogo } from "@/components/shop/BrandLogo";

export function Footer() {
  const categories = useCategories();
  const institutional = useInstitutional();
  const appearance = useAppearance();
  const whatsapp = institutional.support.whatsapp.replace(/\D/g, "");

  return (
    <footer className="mt-16 overflow-hidden bg-charcoal text-cream sm:mt-24">
      {whatsapp && (
        <div className="ago-pattern border-b border-cream/10">
          <div className="container-page flex flex-col gap-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:py-10">
            <div>
              <h2 className="mt-1 max-w-xl font-display text-2xl sm:text-3xl">
                Fale com nossa equipe
              </h2>
            </div>
            <a
              href={`https://wa.me/55${whatsapp}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-charcoal transition hover:-translate-y-0.5 hover:brightness-95"
            >
              <MessageCircle className="h-5 w-5" /> Falar com a agô
            </a>
          </div>
        </div>
      )}

      <div className="container-page grid grid-cols-1 gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.35fr_1fr_1fr_1.2fr] lg:py-16">
        <div>
          <BrandLogo inverse />
          {appearance.slogan && (
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-cream/65">
              {appearance.slogan}
            </p>
          )}
          <div className="mt-5 flex gap-2">
            {[
              { href: institutional.socials.instagram, label: "Instagram", icon: Instagram },
              { href: institutional.socials.facebook, label: "Facebook", icon: Facebook },
              { href: institutional.socials.youtube, label: "YouTube", icon: Youtube },
            ]
              .filter((item) => item.href.trim())
              .map(({ href, label, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-cream/10 transition hover:bg-primary hover:text-charcoal"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
          </div>
        </div>

        <div>
          <h3 className="font-display text-lg">Cardápio</h3>
          <ul className="mt-4 space-y-2.5 text-sm text-cream/70">
            <li>
              <Link
                to="/emporio"
                className="font-semibold text-primary transition hover:text-cream"
              >
                Empório
              </Link>
            </li>
            {categories
              .filter((category) => category.active)
              .slice(0, 6)
              .map((category) => (
                <li key={category.id}>
                  <Link
                    to="/categoria/$slug"
                    params={{ slug: category.slug }}
                    className="transition hover:text-primary"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
          </ul>
        </div>

        <div>
          <h3 className="font-display text-lg">Atendimento</h3>
          <ul className="mt-4 space-y-2.5 text-sm text-cream/70">
            {institutional.support.email && (
              <li>
                <a href={`mailto:${institutional.support.email}`} className="hover:text-primary">
                  {institutional.support.email}
                </a>
              </li>
            )}
            {whatsapp && (
              <li>
                <a href={`https://wa.me/55${whatsapp}`} className="hover:text-primary">
                  {institutional.support.whatsapp}
                </a>
              </li>
            )}
            {institutional.support.hours && <li>{institutional.support.hours}</li>}
            {institutional.deliveryArea && (
              <li className="pt-2 text-xs leading-relaxed text-cream/50">
                {institutional.deliveryArea}
              </li>
            )}
          </ul>
        </div>

        {institutional.paymentMethods && (
          <div>
            <h3 className="font-display text-lg">Pagamento seguro</h3>
            <p className="mt-4 text-sm leading-relaxed text-cream/65">
              {institutional.paymentMethods}
            </p>
            <div className="mt-4 flex gap-2">
              {[CreditCard, QrCode, ShieldCheck].map((Icon, index) => (
                <span
                  key={index}
                  className="flex h-11 w-12 items-center justify-center rounded-xl border border-cream/10 bg-cream/5"
                >
                  <Icon className="h-5 w-5 text-primary" />
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-cream/10">
        <div className="container-page flex flex-col gap-3 py-6 text-xs text-cream/45 sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {new Date().getFullYear()} {appearance.brandName}. Todos os direitos reservados.
          </span>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <Link to="/privacidade" className="hover:text-primary">
              Privacidade
            </Link>
            <Link to="/termos" className="hover:text-primary">
              Termos de uso
            </Link>
            <Link to="/entregas" className="hover:text-primary">
              Entregas e cancelamentos
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
