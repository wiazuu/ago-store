import { createFileRoute } from "@tanstack/react-router";
import { requireAdminRequest } from "@/lib/admin-auth.server";
import { getAdminOperations } from "@/lib/admin-operations.server";
export const Route = createFileRoute("/api/admin-operations")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        !(await requireAdminRequest(request))
          ? Response.json({ error: "Acesso negado." }, { status: 401 })
          : Response.json(await getAdminOperations(), { headers: { "Cache-Control": "no-store" } }),
    },
  },
});
