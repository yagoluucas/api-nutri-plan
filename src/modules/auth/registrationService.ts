import bcrypt from "bcrypt";
import { Request } from "express";
import mongoose from "mongoose";
import CadastroPendente from "../../database/cadastroPendente.js";
import { conectarAoBancoDeDados } from "../../database/conexaoAoBanco.js";
import Nutricionista, {
  marcarSenhaHasheadaComoConfiavel,
} from "../../database/nutricionista.js";
import SingleUserRegistrationLock from "../../database/singleUserRegistrationLock.js";
import {
  obterConfiguracaoCadastroUnico,
  validarSegredoCadastroUnico,
} from "../../config/singleUserRegistration.js";
import {
  IRegistrationData,
  IRegistrationDataSchema,
  IRegistrationAcceptedResponseSchema,
  IRegistrationConfirmedResponseSchema,
} from "../../interfaces/auth/emailConfirmationInterfaces.js";
import { IErrorCause } from "../../interfaces/errors/erros.js";
import {
  ISingleUserRegistrationCreatedResponseSchema,
  ISingleUserRegistrationLockIdSchema,
} from "../../interfaces/auth/singleUserRegistrationInterfaces.js";
import { INutricionista } from "../../interfaces/usuarios/nutricionistaInterfaces.js";
import { decryptJson, encryptJson } from "../../utils/encryption.js";
import { logger } from "../../utils/logger.js";
import {
  createContextualSearchHash,
  createSearchHash,
  normalizeCrnForSearch,
  normalizeEmailForSearch,
} from "../../utils/searchHash.js";
import { existeConflitoIdentidadeNutricionista } from "../nutricionista/nutricionistaHelpers.js";
import {
  generateConfirmationToken,
  getConfirmationExpiration,
  getPendingRegistrationExpiration,
  hashConfirmationToken,
  sendRegistrationConfirmationEmail,
} from "./emailVerificationService.js";

const PENDING_REGISTRATION_CONTEXT = "auth:cadastro-pendente:payload";
const RESEND_COOLDOWN_MS = 60 * 1_000;
const MAX_EMAIL_SENDS = 3;
const SINGLE_USER_REGISTRATION_LOCK_ID =
  ISingleUserRegistrationLockIdSchema.parse("nutricionista-registration");

type CreateSingleUserAtomically = (
  nutricionista: INutricionista,
) => Promise<"created" | "closed" | undefined>;

type SingleUserRegistrationOptions = {
  createAtomically?: CreateSingleUserAtomically;
};

function getValidConfirmationFilter(now: Date) {
  return {
    $or: [
      { confirmationExpiresAt: { $gt: now } },
      {
        confirmationExpiresAt: { $exists: false },
        expiresAt: { $gt: now },
      },
    ],
  };
}

function getExpiredConfirmationFilter(now: Date) {
  return {
    $or: [
      { confirmationExpiresAt: { $lte: now } },
      {
        confirmationExpiresAt: { $exists: false },
        expiresAt: { $lte: now },
      },
    ],
  };
}

const GENERIC_ACCEPTED_RESPONSE = IRegistrationAcceptedResponseSchema.parse({
  message:
    "Se os dados puderem ser utilizados, enviaremos um link de confirmacao para o e-mail informado.",
  error: false,
  statusCode: 202,
});

function getRequestIp(req: Request) {
  return req.ip || req.socket.remoteAddress || "unknown";
}

function createRequestIpHash(req: Request) {
  return createContextualSearchHash(
    getRequestIp(req),
    "auth:cadastro-pendente:ip",
  );
}

function getRegistrationData(nutricionista: INutricionista) {
  const { senha: _senha, ...registrationData } = nutricionista;

  return IRegistrationDataSchema.parse({
    ...registrationData,
    dataNascimento: registrationData.dataNascimento.toISOString(),
  });
}

function isDuplicateKeyError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

function emailServiceUnavailableError() {
  return new Error(
    "Nao foi possivel enviar o e-mail de confirmacao. Tente novamente mais tarde.",
    {
      cause: {
        cause: "Internal Server Error",
        internalCause: "Unexpected Error",
        statusCode: 503,
      } as IErrorCause,
    },
  );
}

function invalidConfirmationLinkError() {
  return new Error("Link de confirmacao invalido ou expirado.", {
    cause: {
      cause: "Invalid Request",
      internalCause: "Invalid Token",
      statusCode: 400,
    } as IErrorCause,
  });
}

function confirmationConflictError() {
  return new Error("Nao foi possivel concluir o cadastro.", {
    cause: {
      cause: "Conflict",
      internalCause: "User Already Registered",
      statusCode: 409,
    } as IErrorCause,
  });
}

function registrationClosedError() {
  return new Error("Cadastro de nutricionista indisponivel.", {
    cause: {
      cause: "Forbidden",
      statusCode: 403,
    } as IErrorCause,
  });
}

async function isSingleUserRegistrationLocked() {
  return Boolean(
    await SingleUserRegistrationLock.exists({
      _id: SINGLE_USER_REGISTRATION_LOCK_ID,
    }),
  );
}

async function ensureEmailConfirmationRegistrationAvailable() {
  const configuration = obterConfiguracaoCadastroUnico();

  if (configuration.enabled) {
    throw registrationClosedError();
  }

  await conectarAoBancoDeDados();

  if (await isSingleUserRegistrationLocked()) {
    throw registrationClosedError();
  }
}

async function createSingleUserAtomically(
  nutricionista: INutricionista,
) {
  await SingleUserRegistrationLock.init();
  const session = await mongoose.startSession();

  try {
    return await session.withTransaction(async () => {
      await SingleUserRegistrationLock.create(
        [{ _id: SINGLE_USER_REGISTRATION_LOCK_ID }],
        { session },
      );

      const existingUser = await Nutricionista.exists({}).session(session);

      if (existingUser) {
        await CadastroPendente.deleteMany({}, { session });
        return "closed" as const;
      }

      const newUser = new Nutricionista(nutricionista);
      await newUser.save({ session });
      await CadastroPendente.deleteMany({}, { session });

      return "created" as const;
    });
  } finally {
    await session.endSession();
  }
}

async function createSingleUserRegistration(
  nutricionista: INutricionista,
  options: SingleUserRegistrationOptions = {},
) {
  try {
    const result = await (
      options.createAtomically ?? createSingleUserAtomically
    )(nutricionista);

    if (result !== "created") {
      throw registrationClosedError();
    }

    return ISingleUserRegistrationCreatedResponseSchema.parse({
      message: "Nutricionista cadastrado com sucesso.",
      error: false,
      statusCode: 201,
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw registrationClosedError();
    }

    throw error;
  }
}

async function updateDeliveryStatusSafely(
  id: mongoose.Types.ObjectId,
  deliveryStatus: "sent" | "failed",
) {
  try {
    await CadastroPendente.updateOne({ _id: id }, { $set: { deliveryStatus } });
  } catch {
    logger.error(
      "registration_email_delivery_status_update_failed",
      new Error("Falha ao atualizar status interno do envio."),
    );
  }
}

async function iniciarCadastro(
  nutricionista: INutricionista,
  req: Request,
  registrationSecret?: string,
) {
  const singleUserConfiguration = obterConfiguracaoCadastroUnico();

  if (
    singleUserConfiguration.enabled &&
    !validarSegredoCadastroUnico(
      registrationSecret,
      singleUserConfiguration.secret,
    )
  ) {
    throw registrationClosedError();
  }

  await conectarAoBancoDeDados();

  if (await isSingleUserRegistrationLocked()) {
    throw registrationClosedError();
  }

  if (singleUserConfiguration.enabled) {
    return createSingleUserRegistration(nutricionista);
  }

  const now = new Date();
  const emailHash = createSearchHash(
    normalizeEmailForSearch(nutricionista.email),
  );
  const crnHash = createSearchHash(normalizeCrnForSearch(nutricionista.crn));
  const requestIpHash = createRequestIpHash(req);

  // O custo ocorre antes das consultas para reduzir diferencas de tempo entre
  // identidades novas e ja existentes.
  const passwordHash = await bcrypt.hash(nutricionista.senha, 10);
  const existingUser = await existeConflitoIdentidadeNutricionista({
    email: nutricionista.email,
    crn: nutricionista.crn,
  });

  if (existingUser) {
    return GENERIC_ACCEPTED_RESPONSE;
  }

  const activePendingRegistration = await CadastroPendente.findOne({
    $and: [
      { $or: [{ emailHash }, { crnHash }] },
      getValidConfirmationFilter(now),
    ],
  });

  if (activePendingRegistration) {
    await CadastroPendente.updateOne(
      {
        _id: activePendingRegistration._id,
        ...getValidConfirmationFilter(now),
      },
      {
        $inc: { registrationAttemptCount: 1 },
        $set: { lastAttemptAt: now, lastIpHash: requestIpHash },
      },
    );

    return GENERIC_ACCEPTED_RESPONSE;
  }

  await CadastroPendente.deleteMany({
    $and: [
      { $or: [{ emailHash }, { crnHash }] },
      getExpiredConfirmationFilter(now),
    ],
  });

  const token = generateConfirmationToken();
  const registrationData = getRegistrationData(nutricionista);
  let pendingRegistration;

  try {
    pendingRegistration = await CadastroPendente.create({
      registrationDataEncrypted: encryptJson(
        registrationData,
        PENDING_REGISTRATION_CONTEXT,
      ),
      passwordHash,
      emailHash,
      crnHash,
      initialIpHash: requestIpHash,
      lastIpHash: requestIpHash,
      confirmationTokenHash: hashConfirmationToken(token),
      deliveryStatus: "pending",
      registrationAttemptCount: 1,
      emailSendCount: 1,
      lastAttemptAt: now,
      lastEmailSentAt: now,
      confirmationExpiresAt: getConfirmationExpiration(now),
      expiresAt: getPendingRegistrationExpiration(now),
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return GENERIC_ACCEPTED_RESPONSE;
    }

    throw error;
  }

  try {
    await sendRegistrationConfirmationEmail(nutricionista.email, token);
    await updateDeliveryStatusSafely(pendingRegistration._id, "sent");
  } catch {
    await updateDeliveryStatusSafely(pendingRegistration._id, "failed");
    logger.error(
      "registration_confirmation_email_send_failed",
      new Error("Falha controlada no servico de e-mail."),
    );
    throw emailServiceUnavailableError();
  }

  return GENERIC_ACCEPTED_RESPONSE;
}

async function reenviarConfirmacao(email: string, req: Request) {
  await ensureEmailConfirmationRegistrationAvailable();

  const now = new Date();
  const cooldownLimit = new Date(now.getTime() - RESEND_COOLDOWN_MS);
  const emailHash = createSearchHash(normalizeEmailForSearch(email));
  const token = generateConfirmationToken();
  const pendingRegistration = await CadastroPendente.findOneAndUpdate(
    {
      emailHash,
      expiresAt: { $gt: now },
      emailSendCount: { $lt: MAX_EMAIL_SENDS },
      $or: [
        { lastEmailSentAt: { $exists: false } },
        { lastEmailSentAt: { $lte: cooldownLimit } },
      ],
    },
    {
      $set: {
        confirmationTokenHash: hashConfirmationToken(token),
        deliveryStatus: "pending",
        lastAttemptAt: now,
        lastEmailSentAt: now,
        lastIpHash: createRequestIpHash(req),
        confirmationExpiresAt: getConfirmationExpiration(now),
        expiresAt: getPendingRegistrationExpiration(now),
      },
      $inc: { registrationAttemptCount: 1, emailSendCount: 1 },
    },
    { new: true },
  ).select("+registrationDataEncrypted");

  if (!pendingRegistration) {
    return GENERIC_ACCEPTED_RESPONSE;
  }

  const registrationData = IRegistrationDataSchema.parse(
    decryptJson<IRegistrationData>(
      pendingRegistration.registrationDataEncrypted,
      PENDING_REGISTRATION_CONTEXT,
    ),
  );

  try {
    await sendRegistrationConfirmationEmail(registrationData.email, token);
    await updateDeliveryStatusSafely(pendingRegistration._id, "sent");
  } catch {
    await updateDeliveryStatusSafely(pendingRegistration._id, "failed");
    logger.error(
      "registration_confirmation_email_resend_failed",
      new Error("Falha controlada no servico de e-mail."),
    );
    throw emailServiceUnavailableError();
  }

  return GENERIC_ACCEPTED_RESPONSE;
}

async function confirmarCadastro(token: string) {
  await ensureEmailConfirmationRegistrationAvailable();

  const session = await mongoose.startSession();

  try {
    const result = await session.withTransaction(async () => {
      const pendingRegistration = await CadastroPendente.findOneAndDelete(
        {
          confirmationTokenHash: hashConfirmationToken(token),
          ...getValidConfirmationFilter(new Date()),
        },
        { session },
      ).select("+registrationDataEncrypted +passwordHash");

      if (!pendingRegistration) {
        throw invalidConfirmationLinkError();
      }

      const registrationData = IRegistrationDataSchema.parse(
        decryptJson<IRegistrationData>(
          pendingRegistration.registrationDataEncrypted,
          PENDING_REGISTRATION_CONTEXT,
        ),
      );
      const identityConflict = await existeConflitoIdentidadeNutricionista({
        email: registrationData.email,
        crn: registrationData.crn,
        session,
      });

      if (identityConflict) {
        throw confirmationConflictError();
      }

      const nutricionista = new Nutricionista({
        ...registrationData,
        dataNascimento: registrationData.dataNascimento,
        senha: pendingRegistration.passwordHash,
        emailHash: createSearchHash(
          normalizeEmailForSearch(registrationData.email),
        ),
        crnHash: createSearchHash(normalizeCrnForSearch(registrationData.crn)),
      });
      marcarSenhaHasheadaComoConfiavel(nutricionista);
      await nutricionista.save({ session });

      return true;
    });

    if (!result) {
      throw new Error("A transacao de confirmacao nao foi concluida.");
    }

    return IRegistrationConfirmedResponseSchema.parse({
      message: "E-mail confirmado e nutricionista cadastrado com sucesso.",
      error: false,
      statusCode: 201,
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw confirmationConflictError();
    }

    throw error;
  } finally {
    await session.endSession();
  }
}

export {
  confirmarCadastro,
  createSingleUserRegistration,
  iniciarCadastro,
  reenviarConfirmacao,
};
