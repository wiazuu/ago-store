import { createFileRoute } from "@tanstack/react-router";
import { requireAdminRequest } from "@/lib/admin-auth.server";
import { looksLikeAdminData, publicAdminContent, readAdminContent, writeAdminContent } from "@/lib/admin-content.server";
import { clientIp, privacyHash } from "@/lib/security.server";

const responseHeaders = { "Cache-Control": "no-store, no-cache, must-revalidate", Pragma: "no-cache" };

export const Route = createFileRoute("/api/admin-state")({
  server: { handlers: {
    GET: async ({ request }) => {
      const stored = await readAdminContent();
      const admin = await requireAdminRequest(request);
      return Response.json({ data: admin ? stored.data : publicAdminContent(stored.data), updatedAt: stored.updatedAt, version: stored.version }, { headers: responseHeaders });
    },
    PUT: async ({ request }) => {
      const session = await requireAdminRequest(request, { csrf: true });
      if (!session) return Response.json({ error: "Sessão administrativa expirada ou inválida." }, { status: 401 });
      const length = Number(request.headers.get("content-length") || 0);
      if (length > 5_000_000) return Response.json({ error: "Conteúdo muito grande." }, { status: 413 });
      const body = (await request.json().catch(() => null)) as { data?: unknown } | null;
      if (!body || !looksLikeAdminData(body.data)) return Response.json({ error: "Conteúdo inválido." }, { status: 400 });
      const stored = await writeAdminContent(body.data, session.userId, privacyHash(clientIp(request)));
      return Response.json({ published: true, updatedAt: stored.updatedAt, version: stored.version }, { headers: responseHeaders });
    },
  } },
});
