import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireAdminRequest } from "@/lib/admin-auth.server";
import { listOrders, updateOrderStatus } from "@/lib/orders.server";
import { clientIp, privacyHash } from "@/lib/security.server";

export const Route = createFileRoute("/api/orders")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        !(await requireAdminRequest(request))
          ? Response.json({ error: "Acesso negado." }, { status: 401 })
          : Response.json(
              { orders: await listOrders() },
              { headers: { "Cache-Control": "no-store" } },
            ),
      PATCH: async ({ request }) => {
        const admin = await requireAdminRequest(request, { csrf: true });
        if (!admin) return Response.json({ error: "Acesso negado." }, { status: 401 });
        const parsed = z
          .object({
            id: z.string().min(5).max(100),
            status: z.enum([
              "recebido",
              "em-preparacao",
              "pronto",
              "saiu-para-entrega",
              "entregue",
              "cancelado",
              "reembolsado",
            ]),
          })
          .safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ error: "Dados inválidos." }, { status: 400 });
        let order;
        try {
          order = await updateOrderStatus(
            parsed.data.id,
            parsed.data.status,
            admin.userId,
            privacyHash(clientIp(request)),
          );
        } catch (cause) {
          return Response.json(
            {
              error:
                cause instanceof Error ? cause.message : "Não foi possível atualizar o pedido.",
            },
            { status: 400 },
          );
        }
        return order
          ? Response.json({ order })
          : Response.json({ error: "Pedido não encontrado." }, { status: 404 });
      },
    },
  },
});
