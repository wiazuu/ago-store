import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireAdminRequest } from "@/lib/admin-auth.server";
import { listFulfillmentDays, upsertFulfillmentDay } from "@/lib/fulfillment.server";

const schema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  deliveryEnabled: z.boolean(),
  pickupEnabled: z.boolean(),
  capacity: z.number().int().min(1).max(5000),
  cutoffAt: z.string().datetime().nullable().optional(),
  note: z.string().trim().max(200).nullable().optional(),
});
export const Route = createFileRoute("/api/delivery-calendar")({
  server: {
    handlers: {
      GET: async () =>
        Response.json(
          { days: await listFulfillmentDays() },
          { headers: { "Cache-Control": "no-store" } },
        ),
      PUT: async ({ request }) => {
        const admin = await requireAdminRequest(request, { csrf: true });
        if (!admin) return Response.json({ error: "Acesso negado." }, { status: 401 });
        const parsed = schema.safeParse(await request.json().catch(() => null));
        if (!parsed.success)
          return Response.json({ error: "Revise os dados do calendário." }, { status: 400 });
        return Response.json({ day: await upsertFulfillmentDay(parsed.data) });
      },
    },
  },
});
