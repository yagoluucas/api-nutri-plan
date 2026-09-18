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
  const conversation = IMcpClientConversationSchema.parse(input);
  const validatedSecret = IMcpContextHashKeySchema.parse(secret);

  const conversationKey = crypto
    .createHmac("sha256", validatedSecret)
    .update(`${conversation.provider}\0${conversation.sessionId}`, "utf8")
    .digest("hex");

  return IMcpConversationKeySchema.parse(conversationKey);
}

function createMcpDietContextRequestRef() {
  const requestRef = `mcr_${crypto.randomBytes(16).toString("base64url")}`;
  return IMcpDietContextRequestRefSchema.parse(requestRef);
}

export { createMcpConversationKey, createMcpDietContextRequestRef };
