import assert from "node:assert/strict";
import test from "node:test";
import {
  createMcpConversationKey,
  createMcpDietContextRequestRef,
} from "../src/utils/mcpContext.js";

test("gera a mesma chave para a mesma conversa MCP", () => {
  const input = {
    provider: "openai",
    sessionId: "chat-session-anonima-123",
  };

  assert.equal(createMcpConversationKey(input), createMcpConversationKey(input));
});

test("isola conversas diferentes", () => {
  const first = createMcpConversationKey({
    provider: "openai",
    sessionId: "chat-session-a",
  });
  const second = createMcpConversationKey({
    provider: "openai",
    sessionId: "chat-session-b",
  });

  assert.notEqual(first, second);
});

test("isola provedores diferentes", () => {
  const first = createMcpConversationKey({
    provider: "openai",
    sessionId: "mesma-sessao",
  });
  const second = createMcpConversationKey({
    provider: "outro-cliente-mcp",
    sessionId: "mesma-sessao",
  });

  assert.notEqual(first, second);
});

test("nao persiste o identificador bruto da conversa na chave", () => {
  const sessionId = "identificador-externo-nao-deve-ser-persistido";
  const key = createMcpConversationKey({
    provider: "openai",
    sessionId,
  });

  assert.equal(key.length, 64);
  assert.equal(key.includes(sessionId), false);
});

test("rejeita identificador de conversa vazio", () => {
  assert.throws(
    () =>
      createMcpConversationKey({
        provider: "openai",
        sessionId: "   ",
      }),
  );
});

test("gera referencias opacas para solicitacoes de contexto", () => {
  const first = createMcpDietContextRequestRef();
  const second = createMcpDietContextRequestRef();

  assert.match(first, /^mcr_[A-Za-z0-9_-]{22}$/);
  assert.match(second, /^mcr_[A-Za-z0-9_-]{22}$/);
  assert.notEqual(first, second);
});
