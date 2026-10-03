import { z } from "zod";

export const IMcpClientConversationSchema = z
  .object({
    provider: z.string().trim().min(1).max(50),
    sessionId: z.string().trim().min(1).max(512),
  })
  .strict();

export const IMcpConversationKeySchema = z
  .string()
  .regex(/^[a-f0-9]{64}$/, "Chave de conversa MCP invalida");

export const IMcpDietContextRequestRefSchema = z
  .string()
  .regex(/^mcr_[A-Za-z0-9_-]{22}$/, "Referencia de contexto MCP invalida");

export const IMcpDietContextPurposeSchema = z.literal("diet-plan-draft");

export const IMcpDietContextStatusSchema = z.enum([
  "pending",
  "active",
  "revoked",
]);

export type IMcpClientConversation = z.infer<
  typeof IMcpClientConversationSchema
>;
export type IMcpDietContextStatus = z.infer<
  typeof IMcpDietContextStatusSchema
>;
