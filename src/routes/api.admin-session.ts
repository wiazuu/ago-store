import { createFileRoute } from "@tanstack/react-router";
import {
  authenticateAdmin,
  clearAdminSessionCookie,
  createAdminSessionCookie,
  destroyAdminSession,
  getAdminSession,
  requireAdminRequest,
} from "@/lib/admin-auth.server";

export const Route = createFileRoute("/api/admin-session")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        Response.json(
          { authenticated: Boolean(await getAdminSession(request)) },
          { headers: { "Cache-Control": "no-store" } },
        ),
      POST: async ({ request }) => {
        const origin = request.headers.get("origin");
        if (origin && new URL(origin).origin !== new URL(request.url).origin && origin !== process.env.PUBLIC_SITE_URL) {
          return Response.json({ error: "Origem não autorizada." }, { status: 403 });
        }
        const body = (await request.json().catch(() => null)) as {
          username?: string;
          password?: string;
        } | null;
        if (!body || typeof body.username !== "string" || typeof body.password !== "string") {
          return Response.json({ error: "Dados de acesso inválidos." }, { status: 400 });
        }
        const result = await authenticateAdmin(request, body.username, body.password);
        if (!result.ok) {
          return Response.json(
            { error: result.limited ? "Muitas tentativas. Aguarde 15 minutos." : "Usuário ou senha inválidos." },
            { status: result.limited ? 429 : 401 },
          );
        }
        return Response.json(
          { authenticated: true, csrfToken: result.csrfToken, username: result.username },
          { headers: { "Set-Cookie": createAdminSessionCookie(request, result.token), "Cache-Control": "no-store" } },
        );
      },
      DELETE: async ({ request }) => {
        if (!(await requireAdminRequest(request, { csrf: true }))) {
          return Response.json({ error: "Sessão inválida." }, { status: 401 });
        }
        await destroyAdminSession(request);
        return Response.json(
          { authenticated: false },
          { headers: { "Set-Cookie": clearAdminSessionCookie(request), "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
