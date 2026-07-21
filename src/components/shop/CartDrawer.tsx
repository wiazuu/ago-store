import { X, Minus, Plus, Trash2, Tag } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useShopStore, useCartSubtotal } from "@/store/shop-store";
import { useInstitutional, useAdminStore } from "@/store/admin-store";
import { brl } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useEffect, useMemo } from "react";
import { calculateOrderSummary } from "@/lib/commerce";

export function CartDrawer() {
  const open = useShopStore((s) => s.drawerOpen);
  const close = useShopStore((s) => s.closeDrawer);
  const items = useShopStore((s) => s.items);
  const setQty = useShopStore((s) => s.setQty);
  const remove = useShopStore((s) => s.remove);
  const coupon = useShopStore((s) => s.coupon);
  const setCoupon = useShopStore((s) => s.setCoupon);
  const subtotal = useCartSubtotal();
  const inst = useInstitutional();
  const coupons = useAdminStore((s) => s.coupons);
  const [couponInput, setCouponInput] = useState(coupon ?? "");
  const [error, setError] = useState<string | null>(null);

  const freeShipMin = inst.freeShippingMin;
  const progress = Math.min(100, (subtotal / freeShipMin) * 100);
  const lines = useMemo(
    () =>
      items.map((item) => ({ productId: item.productId, qty: item.qty, unitPrice: item.price })),
    [items],
  );
  const summary = calculateOrderSummary({
    lines,
    couponCode: coupon,
    coupons,
    freeShippingMin: freeShipMin,
  });

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const apply = () => {
    setError(null);
    const candidate = calculateOrderSummary({
      lines,
      couponCode: couponInput,
      coupons,
      freeShippingMin: freeShipMin,
    });
    if (candidate.error || !candidate.coupon) return setError(candidate.error ?? "Cupom inválido.");
    setCoupon(candidate.coupon.code);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40" onClick={close}>
      <aside
        className="absolute bottom-0 right-0 top-0 flex w-full max-w-md flex-col bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Sua sacola"
      >
        <div className="flex items-center justify-between p-5 border-b">
          <div className="font-display text-xl">Sua sacola</div>
          <button onClick={close}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-3xl">
              🛒
            </div>
            <div className="font-display text-lg">Sua sacola está vazia</div>
            <p className="text-sm text-muted-foreground">Adicione refeições e monte seu kit</p>
            <Button onClick={close} className="rounded-full mt-2">
              Explorar cardápio
            </Button>
          </div>
        ) : (
          <>
            <div className="px-5 py-3 bg-muted/50 border-b">
              {subtotal < freeShipMin ? (
                <>
                  <div className="text-xs text-muted-foreground mb-1.5">
                    Faltam <b className="text-foreground">{brl(freeShipMin - subtotal)}</b> para
                    frete grátis
                  </div>
                  <div className="h-1.5 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </>
              ) : (
                <div className="text-xs text-secondary-foreground bg-secondary/20 py-1 px-2 rounded text-center">
                  🎉 Você ganhou frete grátis!
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {items.map((i) => (
                <div key={i.productId} className="flex gap-3">
                  <img src={i.image} alt={i.name} className="w-20 h-20 rounded-xl object-cover" />
                  <div className="flex-1 flex flex-col">
                    <div className="text-sm font-medium leading-tight">{i.name}</div>
                    <div className="text-sm text-muted-foreground">{brl(i.price)}</div>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center border rounded-full">
                        <button onClick={() => setQty(i.productId, i.qty - 1)} className="p-1.5">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-sm">{i.qty}</span>
                        <button onClick={() => setQty(i.productId, i.qty + 1)} className="p-1.5">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <button
                        onClick={() => remove(i.productId)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t p-5 space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="Cupom"
                    className="w-full pl-9 pr-3 py-2 rounded-full bg-muted text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <Button variant="outline" onClick={apply} className="rounded-full">
                  Aplicar
                </Button>
              </div>
              {error && <div className="text-xs text-destructive">{error}</div>}
              {summary.coupon && (
                <div className="text-xs text-secondary">Cupom {summary.coupon.code} aplicado</div>
              )}

              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{brl(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Frete</span>
                  <span>{summary.shipping === 0 ? "Grátis" : brl(summary.shipping)}</span>
                </div>
                {summary.discount > 0 && (
                  <div className="flex justify-between text-secondary">
                    <span>Desconto</span>
                    <span>-{brl(summary.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-display text-lg pt-2 border-t">
                  <span>Total</span>
                  <span>{brl(summary.total)}</span>
                </div>
              </div>

              <Link to="/checkout" onClick={close}>
                <Button className="w-full rounded-full h-12 text-base">Finalizar compra</Button>
              </Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
