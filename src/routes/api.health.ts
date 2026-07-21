import { createFileRoute } from "@tanstack/react-router";
import { sql } from "drizzle-orm";
import { getDatabase, hasDatabase } from "@/db/client.server";

export const Route = createFileRoute("/api/health")({ server: { handlers: {
  GET: async () => {
    if (!hasDatabase()) return Response.json({ status: "degraded", database: false }, { status: 503 });
    try { await getDatabase().execute(sql`select 1`); return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } }); }
    catch { return Response.json({ status: "degraded", database: false }, { status: 503 }); }
  },
} } });
