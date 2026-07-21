import { createFileRoute } from "@tanstack/react-router";
import { requireAdminRequest } from "@/lib/admin-auth.server";
import { createEmporiumProduct, emporiumInputSchema, listEmporiumProducts } from "@/lib/emporium.server";
import { clientIp, privacyHash } from "@/lib/security.server";

export const Route = createFileRoute("/api/emporio")({ server: { handlers: {
  GET: async ({ request }) => {
    const admin = await requireAdminRequest(request);
    return Response.json({ products: await listEmporiumProducts(Boolean(admin)) }, { headers: { "Cache-Control": "no-store" } });
  },
  POST: async ({ request }) => {
    const admin = await requireAdminRequest(request, { csrf: true });
    if (!admin) return Response.json({ error: "Acesso negado." }, { status: 401 });
    const parsed = emporiumInputSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: "Revise os campos do produto." }, { status: 400 });
    try {
      const product = await createEmporiumProduct(parsed.data, admin.userId, privacyHash(clientIp(request)));
      return Response.json({ product }, { status: 201 });
    } catch (cause) {
      const conflict = cause instanceof Error && cause.message.includes("unique");
      return Response.json({ error: conflict ? "Já existe um produto com esse endereço." : "Não foi possível criar o produto." }, { status: conflict ? 409 : 500 });
    }
  },
} } });
