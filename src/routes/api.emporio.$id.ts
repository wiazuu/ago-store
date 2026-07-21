import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireAdminRequest } from "@/lib/admin-auth.server";
import { deleteEmporiumProduct, emporiumInputSchema, updateEmporiumProduct } from "@/lib/emporium.server";
import { clientIp, privacyHash } from "@/lib/security.server";

const idSchema = z.string().uuid();
export const Route = createFileRoute("/api/emporio/$id")({ server: { handlers: {
  PUT: async ({ request, params }) => {
    const admin = await requireAdminRequest(request, { csrf: true });
    const id = idSchema.safeParse(params.id); const input = emporiumInputSchema.safeParse(await request.json().catch(() => null));
    if (!admin) return Response.json({ error: "Acesso negado." }, { status: 401 });
    if (!id.success || !input.success) return Response.json({ error: "Dados inválidos." }, { status: 400 });
    const product = await updateEmporiumProduct(id.data, input.data, admin.userId, privacyHash(clientIp(request)));
    return product ? Response.json({ product }) : Response.json({ error: "Produto não encontrado." }, { status: 404 });
  },
  DELETE: async ({ request, params }) => {
    const admin = await requireAdminRequest(request, { csrf: true }); const id = idSchema.safeParse(params.id);
    if (!admin) return Response.json({ error: "Acesso negado." }, { status: 401 });
    if (!id.success) return Response.json({ error: "Identificador inválido." }, { status: 400 });
    const deleted = await deleteEmporiumProduct(id.data, admin.userId, privacyHash(clientIp(request)));
    return deleted ? Response.json({ deleted: true }) : Response.json({ error: "Produto não encontrado." }, { status: 404 });
  },
} } });
