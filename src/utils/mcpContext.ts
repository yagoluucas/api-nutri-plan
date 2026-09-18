import crypto from "node:crypto";
import {
  IMcpClientConversationSchema,
  IMcpConversationKeySchema,
  IMcpDietContextRequestRefSchema,
} from "../interfaces/mcp/mcpDietContextInterfaces.js";

function createMcpConversationKey(input: unknown) {
  const conversation = IMcpClientConversationSchema.parse(input);
  const conversationKey = crypto
    .createHash("sha256")
    .update(`${conversation.provider}\0${conversation.sessionId}`, "utf8")
    .digest("hex");

  return IMcpConversationKeySchema.parse(conversationKey);
}

function createMcpDietContextRequestRef() {
  const requestRef = `mcr_${crypto.randomBytes(16).toString("base64url")}`;
  return IMcpDietContextRequestRefSchema.parse(requestRef);
}

export { createMcpConversationKey, createMcpDietContextRequestRef };
