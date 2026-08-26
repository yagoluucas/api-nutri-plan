import assert from "node:assert/strict";
import test from "node:test";
import { validarFrontendUrl } from "../src/config/email.js";
import {
  EmailProviderError,
  createEmailService,
} from "../src/modules/email/emailService.js";
import { sanitize } from "../src/utils/logger.js";

const MESSAGE = {
  type: "registration-confirmation",
  to: "recipient@example.com",
  subject: "Confirme seu e-mail no Nutri Plan",
  text: "confirmation-token-secret",
  html: "<p>confirmation-token-secret</p>",
} as const;

function configuredEnvironment(): NodeJS.ProcessEnv {
  return {
    RESEND_API_KEY: "re_test_key_1234",
    RESEND_FROM_EMAIL: "noreply@example.com",
    RESEND_FROM_NAME: "Integrale Nutrição",
  };
}

test("considera o envio concluido quando o Resend retorna um id", async () => {
  let receivedApiKey: string | undefined;
  let receivedPayload: unknown;
  const emailService = createEmailService({
    environment: configuredEnvironment(),
    sendWithResend: async (apiKey, payload) => {
      receivedApiKey = apiKey;
      receivedPayload = payload;
      return { data: { id: "email-id" }, error: null };
    },
  });

  const result = await emailService.send(MESSAGE);

  assert.deepEqual(result, { id: "email-id" });
  assert.equal(receivedApiKey, "re_test_key_1234");
  assert.deepEqual(receivedPayload, {
    from: "Integrale Nutrição <noreply@example.com>",
    to: "recipient@example.com",
    subject: MESSAGE.subject,
    text: MESSAGE.text,
    html: MESSAGE.html,
  });
});

test("trata o campo error retornado pelo Resend como falha", async () => {
  const loggedEntries: unknown[] = [];
  const emailService = createEmailService({
    environment: configuredEnvironment(),
    sendWithResend: async () => ({
      data: null,
      error: {
        message: "provider-error-with-sensitive-context",
      },
    }),
    emailLogger: {
      info(event, metadata) {
        loggedEntries.push({ event, metadata });
      },
      error(event, error, metadata) {
        loggedEntries.push({ event, error, metadata });
      },
    },
  });

  await assert.rejects(emailService.send(MESSAGE), (error: unknown) => {
    assert.ok(error instanceof EmailProviderError);
    assert.equal(error.code, "EMAIL_PROVIDER_SEND_FAILED");
    return true;
  });

  const serializedLogs = JSON.stringify(loggedEntries);
  assert.doesNotMatch(serializedLogs, /re_test_key_1234/);
  assert.doesNotMatch(serializedLogs, /confirmation-token-secret/);
  assert.doesNotMatch(serializedLogs, /recipient@example\.com/);
  assert.doesNotMatch(serializedLogs, /provider-error-with-sensitive-context/);
  assert.doesNotMatch(serializedLogs, /stack/);
  assert.match(serializedLogs, /provider-returned-error/);
});

test("nao inicializa nem chama o provider quando a configuracao esta ausente", async () => {
  let providerWasCalled = false;
  const emailService = createEmailService({
    environment: {},
    sendWithResend: async () => {
      providerWasCalled = true;
      return { data: { id: "unexpected" }, error: null };
    },
  });

  await assert.rejects(emailService.send(MESSAGE), (error: unknown) => {
    assert.ok(error instanceof EmailProviderError);
    assert.equal(error.code, "EMAIL_PROVIDER_NOT_CONFIGURED");
    return true;
  });

  assert.equal(providerWasCalled, false);
});

test("permite inicializar a configuracao da aplicacao sem variaveis do Resend", () => {
  assert.doesNotThrow(() =>
    validarFrontendUrl({
      NODE_ENV: "production",
      FRONTEND_URL: "https://app.example.com",
    }),
  );
});

test("remove chaves do Resend dos logs estruturados e de texto", () => {
  const apiKey = "re_test_key_1234";

  assert.deepEqual(
    sanitize({
      apiKey,
      RESEND_API_KEY: apiKey,
      message: `provider failed for ${apiKey}`,
    }),
    {
      apiKey: "[REDACTED]",
      RESEND_API_KEY: "[REDACTED]",
      message: "provider failed for [REDACTED]",
    },
  );
});
