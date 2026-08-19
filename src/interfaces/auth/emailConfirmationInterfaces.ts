import { z } from "zod";
import { IRetornoApiSchema } from "../generalInterfaces.js";
import { INutricionistaSchema } from "../usuarios/nutricionistaInterfaces.js";

const IRegistrationDataSchema = INutricionistaSchema.omit({
  senha: true,
  dataNascimento: true,
}).extend({
  dataNascimento: z.iso.datetime(),
});

type IRegistrationData = z.infer<typeof IRegistrationDataSchema>;

const IResendRegistrationEmailSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(100),
  })
  .strict();

const IConfirmRegistrationSchema = z
  .object({
    token: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9_-]{43}$/, "Token de confirmacao invalido"),
  })
  .strict();

const IRegistrationAcceptedResponseSchema = IRetornoApiSchema.extend({
  error: z.literal(false),
  statusCode: z.literal(202),
}).strict();

const IRegistrationConfirmedResponseSchema = IRetornoApiSchema.extend({
  error: z.literal(false),
  statusCode: z.literal(201),
}).strict();

const IDeliveryStatusSchema = z.enum(["pending", "sent", "failed"]);

const ICadastroPendenteDBSchema = z.object({
  registrationDataEncrypted: z.string().min(1),
  passwordHash: z.string().regex(/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/),
  emailHash: z.string().regex(/^[a-f0-9]{64}$/),
  crnHash: z.string().regex(/^[a-f0-9]{64}$/),
  initialIpHash: z.string().regex(/^[a-f0-9]{64}$/),
  lastIpHash: z.string().regex(/^[a-f0-9]{64}$/),
  confirmationTokenHash: z.string().regex(/^[a-f0-9]{64}$/),
  deliveryStatus: IDeliveryStatusSchema,
  registrationAttemptCount: z.number().int().nonnegative(),
  emailSendCount: z.number().int().nonnegative(),
  lastAttemptAt: z.date(),
  lastEmailSentAt: z.date().optional(),
  confirmationExpiresAt: z.date(),
  expiresAt: z.date(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

type ICadastroPendenteDB = z.infer<typeof ICadastroPendenteDBSchema>;

export {
  ICadastroPendenteDBSchema,
  ICadastroPendenteDB,
  IConfirmRegistrationSchema,
  IDeliveryStatusSchema,
  IRegistrationDataSchema,
  IRegistrationData,
  IRegistrationAcceptedResponseSchema,
  IRegistrationConfirmedResponseSchema,
  IResendRegistrationEmailSchema,
};
