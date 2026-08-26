import assert from "node:assert/strict";
import test from "node:test";
import type { Request } from "express";
import {
  obterConfiguracaoCadastroUnico,
  validarSegredoCadastroUnico,
} from "../src/config/singleUserRegistration.js";
import {
  confirmarCadastro,
  createSingleUserRegistration,
  iniciarCadastro,
  reenviarConfirmacao,
} from "../src/modules/auth/registrationService.js";
import { sanitize } from "../src/utils/logger.js";

const VALID_SECRET = "single-user-registration-secret-123456";
const NUTRICIONISTA = {
  nome: "Nome",
  sobrenome: "Sobrenome",
  email: "pessoa@example.com",
  dataNascimento: new Date("1990-01-01T00:00:00.000Z"),
  crn: "CRN-00000",
  senha: "Troque#123",
  alimentosFavoritos: [],
};

function assertRegistrationClosed(error: unknown) {
  assert.ok(error instanceof Error);
  assert.equal(error.message, "Cadastro de nutricionista indisponivel.");
  assert.deepEqual(error.cause, {
    cause: "Forbidden",
    statusCode: 403,
  });
  return true;
}

async function withSingleUserEnvironment(callback: () => Promise<void>) {
  const previousEnabled = process.env.SINGLE_USER_REGISTRATION_ENABLED;
  const previousSecret = process.env.SINGLE_USER_REGISTRATION_SECRET;

  process.env.SINGLE_USER_REGISTRATION_ENABLED = "true";
  process.env.SINGLE_USER_REGISTRATION_SECRET = VALID_SECRET;

  try {
    await callback();
  } finally {
    if (previousEnabled === undefined) {
      delete process.env.SINGLE_USER_REGISTRATION_ENABLED;
    } else {
      process.env.SINGLE_USER_REGISTRATION_ENABLED = previousEnabled;
    }

    if (previousSecret === undefined) {
      delete process.env.SINGLE_USER_REGISTRATION_SECRET;
    } else {
      process.env.SINGLE_USER_REGISTRATION_SECRET = previousSecret;
    }
  }
}

test("mantem o cadastro por e-mail quando a flag esta ausente", () => {
  assert.deepEqual(obterConfiguracaoCadastroUnico({}), {
    enabled: false,
  });
});

test("habilita o cadastro unico quando flag e segredo sao validos", () => {
  assert.deepEqual(
    obterConfiguracaoCadastroUnico({
      SINGLE_USER_REGISTRATION_ENABLED: "true",
      SINGLE_USER_REGISTRATION_SECRET: VALID_SECRET,
    }),
    {
      enabled: true,
      secret: VALID_SECRET,
    },
  );
});

test("recusa iniciar o modo unico sem um segredo forte", () => {
  assert.throws(
    () =>
      obterConfiguracaoCadastroUnico({
        SINGLE_USER_REGISTRATION_ENABLED: "true",
        SINGLE_USER_REGISTRATION_SECRET: "segredo-curto",
      }),
    /32 e 256 caracteres/,
  );
});

test("recusa um valor de exemplo mesmo quando ele e longo", () => {
  assert.throws(
    () =>
      obterConfiguracaoCadastroUnico({
        SINGLE_USER_REGISTRATION_ENABLED: "true",
        SINGLE_USER_REGISTRATION_SECRET:
          "um-segredo-de-exemplo-com-mais-de-32-caracteres",
      }),
    /nao pode utilizar um valor de exemplo/,
  );
});

test("recusa valores ambiguos para a flag", () => {
  assert.throws(
    () =>
      obterConfiguracaoCadastroUnico({
        SINGLE_USER_REGISTRATION_ENABLED: "yes",
      }),
    /deve ser "true" ou "false"/,
  );
});

test("aceita somente o segredo exato recebido no header", () => {
  assert.equal(validarSegredoCadastroUnico(VALID_SECRET, VALID_SECRET), true);
  assert.equal(
    validarSegredoCadastroUnico(`${VALID_SECRET}-incorreto`, VALID_SECRET),
    false,
  );
  assert.equal(validarSegredoCadastroUnico(undefined, VALID_SECRET), false);
});

test("remove o segredo de cadastro unico dos logs", () => {
  assert.deepEqual(
    sanitize({
      SINGLE_USER_REGISTRATION_SECRET: VALID_SECRET,
      "X-Registration-Secret": VALID_SECRET,
    }),
    {
      SINGLE_USER_REGISTRATION_SECRET: "[REDACTED]",
      "X-Registration-Secret": "[REDACTED]",
    },
  );
});

test("retorna 201 quando a persistencia atomica cria a primeira conta", async () => {
  let persistenceCalls = 0;

  const response = await createSingleUserRegistration(NUTRICIONISTA, {
    createAtomically: async () => {
      persistenceCalls += 1;
      return "created";
    },
  });

  assert.equal(persistenceCalls, 1);
  assert.deepEqual(response, {
    message: "Nutricionista cadastrado com sucesso.",
    error: false,
    statusCode: 201,
  });
});

test("trata uma trava existente como cadastro fechado", async () => {
  await assert.rejects(
    createSingleUserRegistration(NUTRICIONISTA, {
      createAtomically: async () => "closed",
    }),
    assertRegistrationClosed,
  );
});

test("aceita apenas uma criacao quando duas tentativas concorrem pela trava", async () => {
  let locked = false;
  const createAtomically = async () => {
    await Promise.resolve();

    if (locked) {
      return "closed" as const;
    }

    locked = true;
    return "created" as const;
  };

  const results = await Promise.allSettled([
    createSingleUserRegistration(NUTRICIONISTA, { createAtomically }),
    createSingleUserRegistration(NUTRICIONISTA, { createAtomically }),
  ]);

  assert.equal(
    results.filter((result) => result.status === "fulfilled").length,
    1,
  );
  assert.equal(
    results.filter((result) => result.status === "rejected").length,
    1,
  );
});

test("segredo incorreto fecha o cadastro antes de acessar o banco", async () => {
  await withSingleUserEnvironment(async () => {
    await assert.rejects(
      iniciarCadastro(
        NUTRICIONISTA,
        {} as Request,
        "segredo-incorreto-com-mais-de-32-caracteres",
      ),
      assertRegistrationClosed,
    );
  });
});

test("modo unico bloqueia reenvio e confirmacao sem acessar o provider", async () => {
  await withSingleUserEnvironment(async () => {
    await assert.rejects(
      reenviarConfirmacao("pessoa@example.com", {} as Request),
      assertRegistrationClosed,
    );
    await assert.rejects(
      confirmarCadastro("token-nao-utilizado-no-modo-unico"),
      assertRegistrationClosed,
    );
  });
});
