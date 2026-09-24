import { z } from "zod";

const IEmailTypeSchema = z.enum(["registration-confirmation"]);

const IEmailMessageSchema = z
  .object({
    type: IEmailTypeSchema,
    to: z.string().trim().toLowerCase().email().max(254),
    subject: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .refine((value) => !/[\r\n]/.test(value), "Assunto de e-mail invalido."),
    text: z.string().min(1),
    html: z.string().min(1),
  })
  .strict();

const IResendConfigurationSchema = z
  .object({
    apiKey: z
      .string()
      .trim()
      .regex(/^re_[A-Za-z0-9_-]{4,}$/, "RESEND_API_KEY invalida."),
    fromEmail: z.string().trim().toLowerCase().email(),
    fromName: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .refine(
        (value) => !/[\r\n<>"]/.test(value),
        "RESEND_FROM_NAME invalido.",
      ),
  })
  .strict();

const IEmailDeliveryResultSchema = z
  .object({
    id: z.string().trim().min(1),
  })
  .strict();

const IEmailProviderErrorCodeSchema = z.enum([
  "EMAIL_PROVIDER_NOT_CONFIGURED",
  "EMAIL_PROVIDER_INVALID_CONFIGURATION",
  "EMAIL_PROVIDER_SEND_FAILED",
  "EMAIL_PROVIDER_INVALID_RESPONSE",
]);

type IEmailMessage = z.infer<typeof IEmailMessageSchema>;
type IResendConfiguration = z.infer<typeof IResendConfigurationSchema>;
type IEmailDeliveryResult = z.infer<typeof IEmailDeliveryResultSchema>;
type IEmailProviderErrorCode = z.infer<
  typeof IEmailProviderErrorCodeSchema
>;

export {
  IEmailDeliveryResultSchema,
  IEmailMessageSchema,
  IEmailProviderErrorCodeSchema,
  IEmailTypeSchema,
  IResendConfigurationSchema,
};
export type {
  IEmailDeliveryResult,
  IEmailMessage,
  IEmailProviderErrorCode,
  IResendConfiguration,
};
