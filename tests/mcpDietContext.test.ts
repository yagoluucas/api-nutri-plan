import assert from "node:assert/strict";
import test from "node:test";
import {
  createMcpConversationKey,
  createMcpDietContextRequestRef,
} from "../src/utils/mcpContext.js";

const HASH_KEY = "mcp-context-hash-key-for-tests-1234567890";

function getConversationKey(input: unknown, secret = HASH_KEY) {
  const result = createMcpConversationKey(input, secret);

  assert.equal(result.success, true);

  if (!result.success) {
    throw result.error;
  }

  return result.data;
}

function getDietContextRequestRef() {
  const result = createMcpDietContextRequestRef();

  assert.equal(result.success, true);

  if (!result.success) {
    throw result.error;
  }

  return result.data;
}

test("gera a mesma chave para a mesma conversa MCP", () => {
  const input = {
    provider: "openai",
    sessionId: "chat-session-anonima-123",
  };

  assert.equal(getConversationKey(input), getConversationKey(input));
});

test("isola conversas diferentes", () => {
  const first = getConversationKey({
    provider: "openai",
    sessionId: "chat-session-a",
  });
  const second = getConversationKey({
    provider: "openai",
    sessionId: "chat-session-b",
  });

  assert.notEqual(first, second);
});

test("isola provedores diferentes", () => {
  const first = getConversationKey({
    provider: "openai",
    sessionId: "mesma-sessao",
  });
  const second = getConversationKey({
    provider: "outro-cliente-mcp",
    sessionId: "mesma-sessao",
  });

  assert.notEqual(first, second);
});

test("isola chaves secretas diferentes", () => {
  const input = {
    provider: "openai",
    sessionId: "mesma-sessao",
  };

  const first = getConversationKey(
    input,
    "primeira-chave-de-contexto-mcp-com-32-caracteres",
  );
  const second = getConversationKey(
    input,
    "segunda-chave-de-contexto-mcp-com-32-caracteres",
  );

  assert.notEqual(first, second);
});

test("nao persiste o identificador bruto da conversa na chave", () => {
  const sessionId = "identificador-externo-nao-deve-ser-persistido";
  const key = getConversationKey({
    provider: "openai",
    sessionId,
  });

  assert.equal(key.length, 64);
  assert.equal(key.includes(sessionId), false);
});

test("retorna falha controlada para identificador de conversa vazio", () => {
  const result = createMcpConversationKey(
    {
      provider: "openai",
      sessionId: "   ",
    },
    HASH_KEY,
  );

  assert.equal(result.success, false);
});

test("retorna falha controlada para entrada de conversa desconhecida", () => {
  const result = createMcpConversationKey(null, HASH_KEY);

  assert.equal(result.success, false);
});

test("retorna falha controlada para chave de correlacao fraca", () => {
  const result = createMcpConversationKey(
    {
      provider: "openai",
      sessionId: "chat-session",
    },
    "curta",
  );

  assert.equal(result.success, false);
});

test("gera referencias opacas para solicitacoes de contexto", () => {
  const first = getDietContextRequestRef();
  const second = getDietContextRequestRef();

  assert.match(first, /^mcr_[A-Za-z0-9_-]{22}$/);
  assert.match(second, /^mcr_[A-Za-z0-9_-]{22}$/);
  assert.notEqual(first, second);
});
