import assert from "node:assert/strict";
import test from "node:test";
import { decryptString, encryptString, isAesGcmEncrypted } from "../../src/utils/encryption.js";
import { sanitize } from "../../src/utils/logger.js";
import { configureSecurityEnvironment } from "./environment.js";

configureSecurityEnvironment();

test("AES-GCM preserva o dado e rejeita adulteracao ou contexto incorreto", () => {
  const plain = "Informacao ficticia de teste";
  const encrypted = encryptString(plain, "paciente:nome");
  assert.ok(isAesGcmEncrypted(encrypted));
  assert.notEqual(encrypted, encryptString(plain, "paciente:nome"));
  assert.equal(decryptString(encrypted, "paciente:nome"), plain);
  assert.throws(() => decryptString(encrypted, "nutricionista:nome"));
  const parts = encrypted.split(".");
  parts[3] = (parts[3][0] === "0" ? "1" : "0") + parts[3].slice(1);
  assert.throws(() => decryptString(parts.join("."), "paciente:nome"));
});

test("logger remove credenciais e dados sensiveis de metadados aninhados", () => {
  const output = JSON.stringify(sanitize({
    event: "security_test",
    nested: { senha: "sentinel-password", authorization: "Bearer sentinel-token",
      email: "sentinel@example.com", observacoes: "sentinel-clinical",
      encryptionKey: "sentinel-key", refreshToken: "sentinel-refresh" },
  }));
  assert.ok(output.includes("security_test"));
  assert.ok(!output.includes("sentinel"));
});
