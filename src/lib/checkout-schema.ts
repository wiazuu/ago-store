import { z } from "zod";

const digits = (value: string) => value.replace(/\D/g, "");

export const checkoutRequestSchema = z.object({
  attemptId: z.string().regex(/^[a-zA-Z0-9-]{8,64}$/),
  items: z
    .array(
      z.object({
        productId: z.string().min(1).max(80),
        qty: z.number().int().min(1).max(20),
        selections: z
          .array(
            z.object({
              productId: z.string().min(1).max(80),
              qty: z.number().int().min(1).max(100),
            }),
          )
          .max(100)
          .optional(),
      }),
    )
    .min(1)
    .max(50),
  coupon: z.string().trim().max(40).nullable().optional(),
  subscriptionInterval: z.enum(["weekly", "monthly", "quarterly"]).nullable().optional(),
  customer: z.object({
    name: z.string().trim().min(3).max(100),
    email: z.string().trim().email().max(150),
    phone: z
      .string()
      .trim()
      .refine((value) => digits(value).length >= 10, "Telefone inválido"),
    cpf: z
      .string()
      .trim()
      .refine((value) => digits(value).length === 11, "CPF inválido"),
  }),
  delivery: z
    .object({
      fulfillmentType: z.enum(["delivery", "pickup"]),
      scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      deliveryWindow: z.enum(["manha", "tarde", "noite"]),
      cep: z.string().trim().max(12).default(""),
      street: z.string().trim().max(140).default(""),
      number: z.string().trim().max(20).default(""),
      complement: z.string().trim().max(80).optional().default(""),
      district: z.string().trim().max(80).default(""),
      city: z.string().trim().max(80).default("Manaus"),
      state: z
        .string()
        .trim()
        .length(2)
        .transform((value) => value.toUpperCase()),
      notes: z.string().trim().max(240).optional().default(""),
    })
    .superRefine((delivery, context) => {
      if (delivery.fulfillmentType === "pickup") return;
      if (digits(delivery.cep).length !== 8)
        context.addIssue({ code: "custom", path: ["cep"], message: "CEP inválido" });
      if (delivery.street.length < 3)
        context.addIssue({ code: "custom", path: ["street"], message: "Informe a rua" });
      if (!delivery.number)
        context.addIssue({ code: "custom", path: ["number"], message: "Informe o número" });
      if (delivery.district.length < 2)
        context.addIssue({ code: "custom", path: ["district"], message: "Informe o bairro" });
      if (delivery.city.toLocaleLowerCase("pt-BR") !== "manaus" || delivery.state !== "AM")
        context.addIssue({
          code: "custom",
          path: ["city"],
          message: "As entregas estão disponíveis somente em Manaus/AM",
        });
    }),
});

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;
