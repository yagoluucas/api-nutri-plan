import crypto from "node:crypto";
import { z } from "zod";
import {
  IMcpClientConversationSchema,
  IMcpConversationKeySchema,
  IMcpDietContextRequestRefSchema,
} from "../interfaces/mcp/mcpDietContextInterfaces.js";

const IMcpContextHashKeySchema = z
  .string()
  .trim()
  .min(32, "A chave de correlacao MCP deve ter pelo menos 32 caracteres");

function createMcpConversationKey(input: unknown, secret: string) {
  const conversation = IMcpClientConversationSchema.safeParse(input);

  if (!conversation.success) {
    return conversation;
  }

  const validatedSecret = IMcpContextHashKeySchema.safeParse(secret);

  if (!validatedSecret.success) {
    return validatedSecret;
  }

  const conversationKey = crypto
    .createHmac("sha256", validatedSecret.data)
    .update(
      `${conversation.data.provider}\0${conversation.data.sessionId}`,
      "utf8",
    )
    .digest("hex");

  return IMcpConversationKeySchema.safeParse(conversationKey);
}

function createMcpDietContextRequestRef() {
  const requestRef = `mcr_${crypto.randomBytes(16).toString("base64url")}`;
  return IMcpDietContextRequestRefSchema.safeParse(requestRef);
}

export { createMcpConversationKey, createMcpDietContextRequestRef };
