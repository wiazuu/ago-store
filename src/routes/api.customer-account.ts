import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getCustomerSession } from "@/lib/customer-auth.server";
import {
  getCustomerAccount,
  saveCustomerAddress,
  toggleCustomerFavorite,
  updateCustomerProfile,
  updateCustomerSubscription,
} from "@/lib/customer-account.server";
import { hasSameOrigin } from "@/lib/security.server";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("favorite"), productId: z.string().min(1).max(100) }),
  z.object({
    action: z.literal("profile"),
    name: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(10).max(30),
  }),
  z.object({
    action: z.literal("address"),
    id: z.string().uuid().optional(),
    label: z.string().trim().min(2).max(40),
    cep: z.string().trim().min(8).max(12),
    street: z.string().trim().min(3).max(140),
    number: z.string().trim().min(1).max(20),
    complement: z.string().trim().max(80).optional(),
    district: z.string().trim().min(2).max(80),
    isDefault: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("subscription"),
    id: z.string().uuid(),
    status: z.enum(["active", "paused", "cancelled"]),
  }),
]);

export const Route = createFileRoute("/api/customer-account")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await getCustomerSession(request);
        if (!session) return Response.json({ error: "Entre na sua conta." }, { status: 401 });
        return Response.json(await getCustomerAccount(session), {
          headers: { "Cache-Control": "no-store" },
        });
      },
      PATCH: async ({ request }) => {
        if (!hasSameOrigin(request))
          return Response.json({ error: "Origem não autorizada." }, { status: 403 });
        const session = await getCustomerSession(request);
        if (!session) return Response.json({ error: "Entre na sua conta." }, { status: 401 });
        const parsed = actionSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success)
          return Response.json({ error: "Revise os dados informados." }, { status: 400 });
        const input = parsed.data;
        if (input.action === "favorite")
          return Response.json({
            favorite: await toggleCustomerFavorite(session.userId, input.productId),
          });
        if (input.action === "profile")
          return Response.json({ profile: await updateCustomerProfile(session.userId, input) });
        if (input.action === "address")
          return Response.json({ address: await saveCustomerAddress(session.userId, input) });
        return Response.json({
          subscription: await updateCustomerSubscription(session.userId, input.id, input.status),
        });
      },
    },
  },
});
