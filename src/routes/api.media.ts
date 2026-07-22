import { createFileRoute } from "@tanstack/react-router";
import { auditLogs } from "@/db/schema";
import { getDatabase, hasDatabase } from "@/db/client.server";
import { requireAdminRequest } from "@/lib/admin-auth.server";
import { storeMediaAsset } from "@/lib/media.server";
import { clientIp, privacyHash } from "@/lib/security.server";

export const Route = createFileRoute("/api/media")({
  server: { handlers: {
    POST: async ({ request }) => {
      const admin = await requireAdminRequest(request, { csrf: true });
      if (!admin) return Response.json({ error: "Sessão administrativa expirada ou inválida." }, { status: 401 });
      if (!hasDatabase()) return Response.json({ error: "Banco de dados indisponível." }, { status: 503 });
      const length = Number(request.headers.get("content-length") || 0);
      if (length > 1_000_000) return Response.json({ error: "Arquivo muito grande." }, { status: 413 });

      const form = await request.formData().catch(() => null);
      const file = form?.get("file");
      if (!(file instanceof File)) return Response.json({ error: "Selecione uma imagem." }, { status: 400 });

      try {
        const stored = await storeMediaAsset(new Uint8Array(await file.arrayBuffer()), file.name, admin.userId);
        await getDatabase().insert(auditLogs).values({
          actorId: admin.userId,
          action: "media.upload",
          entity: "media_asset",
          entityId: stored.id,
          details: { contentType: stored.contentType, size: stored.size },
          ipHash: privacyHash(clientIp(request)),
        });
        return Response.json(stored, { status: 201, headers: { "Cache-Control": "no-store" } });
      } catch (error) {
        return Response.json({ error: error instanceof Error ? error.message : "Falha ao enviar imagem." }, { status: 400 });
      }
    },
  } },
});

