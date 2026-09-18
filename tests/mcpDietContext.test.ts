import assert from "node:assert/strict";
import test from "node:test";
import {
  createMcpConversationKey,
  createMcpDietContextRequestRef,
} from "../src/utils/mcpContext.js";

const HASH_KEY = "mcp-context-hash-key-for-tests-1234567890";

test("gera a mesma chave para a mesma conversa MCP", () => {
  const input = {
    provider: "openai",
    sessionId: "chat-session-anonima-123",
  };

  assert.equal(
    createMcpConversationKey(input, HASH_KEY),
    createMcpConversationKey(input, HASH_KEY),
  );
});

test("isola conversas diferentes", () => {
  const first = createMcpConversationKey(
    {
      provider: "openai",
      sessionId: "chat-session-a",
    },
    HASH_KEY,
  );
  const second = createMcpConversationKey(
    {
      provider: "openai",
      sessionId: "chat-session-b",
    },
    HASH_KEY,
  );

  assert.notEqual(first, second);
});

test("isola provedores diferentes", () => {
  const first = createMcpConversationKey(
    {
      provider: "openai",
      sessionId: "mesma-sessao",
    },
    HASH_KEY,
  );
  const second = createMcpConversationKey(
    {
      provider: "outro-cliente-mcp",
      sessionId: "mesma-sessao",
    },
    HASH_KEY,
  );

  assert.notEqual(first, second);
});

test("isola chaves secretas diferentes", () => {
  const input = {
    provider: "openai",
    sessionId: "mesma-sessao",
  };

  const first = createMcpConversationKey(
    input,
    "primeira-chave-de-contexto-mcp-com-32-caracteres",
  );
  const second = createMcpConversationKey(
    input,
    "segunda-chave-de-contexto-mcp-com-32-caracteres",
  );

  assert.notEqual(first, second);
});

test("nao persiste o identificador bruto da conversa na chave", () => {
  const sessionId = "identificador-externo-nao-deve-ser-persistido";
  const key = createMcpConversationKey(
    {
      provider: "openai",
      sessionId,
    },
    HASH_KEY,
  );

  assert.equal(key.length, 64);
  assert.equal(key.includes(sessionId), false);
});

test("rejeita identificador de conversa vazio", () => {
  assert.throws(() =>
    createMcpConversationKey(
      {
        provider: "openai",
        sessionId: "   ",
      },
      HASH_KEY,
    ),
  );
});

test("rejeita chave de correlacao fraca", () => {
  assert.throws(() =>
    createMcpConversationKey(
      {
        provider: "openai",
        sessionId: "chat-session",
      },
      "curta",
    ),
  );
});

test("gera referencias opacas para solicitacoes de contexto", () => {
  const first = createMcpDietContextRequestRef();
  const second = createMcpDietContextRequestRef();

  assert.match(first, /^mcr_[A-Za-z0-9_-]{22}$/);
  assert.match(second, /^mcr_[A-Za-z0-9_-]{22}$/);
  assert.notEqual(first, second);
});
