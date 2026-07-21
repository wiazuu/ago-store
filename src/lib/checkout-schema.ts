import { z } from "zod";

const digits = (value: string) => value.replace(/\D/g, "");

export const checkoutRequestSchema = z.object({
  attemptId: z.string().regex(/^[a-zA-Z0-9-]{8,64}$/),
  items: z
    .array(
      z.object({
        productId: z.string().min(1).max(80),
        qty: z.number().int().min(1).max(20),
      }),
    )
    .min(1)
    .max(50),
  coupon: z.string().trim().max(40).nullable().optional(),
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
  delivery: z.object({
    cep: z
      .string()
      .trim()
      .refine((value) => digits(value).length === 8, "CEP inválido"),
    street: z.string().trim().min(3).max(140),
    number: z.string().trim().min(1).max(20),
    complement: z.string().trim().max(80).optional().default(""),
    district: z.string().trim().min(2).max(80),
    city: z.string().trim().min(2).max(80),
    state: z
      .string()
      .trim()
      .length(2)
      .transform((value) => value.toUpperCase()),
    notes: z.string().trim().max(240).optional().default(""),
  }),
});

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;
