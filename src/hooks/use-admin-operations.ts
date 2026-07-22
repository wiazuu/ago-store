import { useCallback, useEffect, useState } from "react";
export type OperationOrder = {
  id: string;
  customer: { name?: string; email?: string; phone?: string };
  delivery: Record<string, string>;
  items: { productId: string; name: string; qty: number; unitPrice: number }[];
  totalCents: number;
  status: string;
  paymentStatus: string;
  fulfillmentType: string;
  deliveryDate: string | null;
  deliveryWindow: string | null;
  createdAt: string;
};
export type Operations = {
  metrics: {
    revenueCents: number;
    paidOrders: number;
    todayOrders: number;
    averageTicketCents: number;
    activeCustomers: number;
    pendingOrders: number;
  };
  orders: OperationOrder[];
  production: { day: string; productId: string; name: string; qty: number }[];
  customers: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    active: boolean;
    orders: number;
    spentCents: number;
    lastOrderAt: string | null;
    createdAt: string;
  }[];
  audits: {
    id: string;
    action: string;
    entity: string;
    entityId: string | null;
    details: unknown;
    createdAt: string;
  }[];
  emails: {
    eventKey: string;
    type: string;
    recipient: string;
    status: string;
    error: string | null;
    createdAt: string;
  }[];
};
export function useAdminOperations() {
  const [data, setData] = useState<Operations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/admin-operations", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) setError(payload.error || "Falha ao carregar dados.");
    else {
      setData(payload);
      setError("");
    }
    setLoading(false);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  return { data, loading, error, load };
}
