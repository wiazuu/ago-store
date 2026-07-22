import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createCustomerCookie, loginCustomer, registerCustomer } from "@/lib/customer-auth.server";
import { sendCustomerWelcomeEmail } from "@/lib/email.server";
import { allowRequest } from "@/lib/rate-limit.server";
import { hasSameOrigin } from "@/lib/security.server";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(10).max(30),
  password: z.string().min(12).max(200).regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/),
});
export const Route = createFileRoute("/api/customer-register")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!hasSameOrigin(request))
          return Response.json({ error: "Origem não autorizada." }, { status: 403 });
        if (!allowRequest(request, "customer-register", 5, 60 * 60 * 1000))
          return Response.json(
            { error: "Muitos cadastros. Tente novamente mais tarde." },
            { status: 429 },
          );
        const parsed = schema.safeParse(await request.json().catch(() => null));
        if (!parsed.success)
          return Response.json(
            {
              error:
                "Revise seus dados. A senha deve ter 12 caracteres, maiúscula, minúscula e número.",
            },
            { status: 400 },
          );
        try {
          const user = await registerCustomer(parsed.data);
          if (!user)
            return Response.json(
              { error: "Este e-mail já está cadastrado. Use 'Esqueci minha senha' se necessário." },
              { status: 409 },
            );
          await sendCustomerWelcomeEmail({ id: user.id, to: user.email, name: user.name });
          const login = await loginCustomer(request, parsed.data.email, parsed.data.password);
          if (!login) throw new Error("LOGIN_FAILED");
          return Response.json(
            { registered: true, user: login.user },
            {
              status: 201,
              headers: {
                "Set-Cookie": createCustomerCookie(request, login.token),
                "Cache-Control": "no-store",
              },
            },
          );
        } catch (cause) {
          return Response.json(
            {
              error:
                cause instanceof Error && cause.message === "DATABASE_UNAVAILABLE"
                  ? "Cadastro disponível após conectar o banco de dados."
                  : "Não foi possível criar sua conta.",
            },
            { status: 503 },
          );
        }
      },
    },
  },
});
