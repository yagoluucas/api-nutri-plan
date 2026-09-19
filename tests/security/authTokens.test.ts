import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import jwt from "jsonwebtoken";
import { criarTokensSessao, verificarAccessToken } from "../../src/utils/authTokens.js";
import { configureSecurityEnvironment } from "./environment.js";

configureSecurityEnvironment();
const id = "111111111111111111111111";
const sessionId = "222222222222222222222222";

test("JWT valido continua aceito", () => {
  const { accessToken } = criarTokensSessao(id, sessionId);
  assert.deepEqual(verificarAccessToken(accessToken), { id, sessionId, type: "access" });
});

test("JWT expirado, assinatura incorreta, payload invalido e refresh sao rejeitados", () => {
  const secret = process.env.JWT_SECRET!;
  const payload = { id, sessionId, type: "access" };
  const invalid = [
    "invalid-token",
    jwt.sign(payload, secret, { expiresIn: -1 }),
    jwt.sign(payload, randomBytes(32).toString("hex")),
    jwt.sign({ id, type: "access" }, secret),
    jwt.sign({ ...payload, type: "refresh" }, secret),
    criarTokensSessao(id, sessionId).refreshToken,
  ];
  for (const token of invalid) assert.throws(() => verificarAccessToken(token));
});
