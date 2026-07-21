import { useAppearance } from "@/store/admin-store";

type BrandLogoProps = {
  compact?: boolean;
  inverse?: boolean;
  className?: string;
};

export function BrandLogo({ compact = false, inverse = false, className = "" }: BrandLogoProps) {
  const appearance = useAppearance();

  if (appearance.logoUrl) {
    return (
      <img
        src={appearance.logoUrl}
        alt={appearance.brandName}
        className={`h-10 w-auto object-contain md:h-12 ${className}`}
      />
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-2.5 ${inverse ? "text-cream" : "text-charcoal"} ${className}`}
      aria-label={appearance.brandName}
    >
      <img src="/ago-mark.svg" alt="" className="h-9 w-9 shrink-0 md:h-10 md:w-10" />
      {!compact && (
        <span className="ago-wordmark" aria-hidden="true">
          agô
        </span>
      )}
    </span>
  );
}
