import { createFileRoute } from "@tanstack/react-router";
import { auditLogs } from "@/db/schema";
import { getDatabase } from "@/db/client.server";
import { requireAdminRequest } from "@/lib/admin-auth.server";
import { retryFailedTransactionalEmails } from "@/lib/email.server";
import { clientIp, privacyHash } from "@/lib/security.server";

export const Route = createFileRoute("/api/admin-emails-retry")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const admin = await requireAdminRequest(request, { csrf: true });
        if (!admin) return Response.json({ error: "Acesso negado." }, { status: 401 });
        const result = await retryFailedTransactionalEmails();
        await getDatabase()
          .insert(auditLogs)
          .values({
            actorId: admin.userId,
            action: "email.retry_failed",
            entity: "email_deliveries",
            details: result,
            ipHash: privacyHash(clientIp(request)),
          });
        return Response.json(result, { headers: { "Cache-Control": "no-store" } });
      },
    },
  },
});
