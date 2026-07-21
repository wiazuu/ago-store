import { useEffect, useRef } from "react";
import { useAdminStore, type PublicAdminData } from "@/store/admin-store";
import { useShopStore } from "@/store/shop-store";

type PublicStateResponse = { data: PublicAdminData; updatedAt: string };

export function PublicContentSync({ enabled }: { enabled: boolean }) {
  const lastApplied = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let active = true;

    const refresh = async () => {
      if (document.visibilityState === "hidden") return;
      if (useShopStore.getState().adminAuthed) return;
      try {
        const response = await fetch("/api/admin-state", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as PublicStateResponse;
        if (!active || payload.updatedAt === lastApplied.current) return;
        lastApplied.current = payload.updatedAt;
        useAdminStore.getState().applyPublicData(payload.data);
      } catch {
        // Keep the last valid storefront state when the network is temporarily unavailable.
      }
    };

    void refresh();
    const interval = window.setInterval(refresh, 2500);
    const onVisible = () => void refresh();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled]);

  return null;
}
