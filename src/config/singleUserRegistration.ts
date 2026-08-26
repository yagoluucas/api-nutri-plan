import crypto from "node:crypto";
import {
  ISingleUserRegistrationConfiguration,
  ISingleUserRegistrationConfigurationSchema,
} from "../interfaces/auth/singleUserRegistrationInterfaces.js";

function obterConfiguracaoCadastroUnico(
  environment: NodeJS.ProcessEnv = process.env,
): ISingleUserRegistrationConfiguration {
  const enabledValue =
    environment.SINGLE_USER_REGISTRATION_ENABLED?.trim().toLowerCase() ||
    "false";

  if (enabledValue !== "true" && enabledValue !== "false") {
    throw new Error(
      'SINGLE_USER_REGISTRATION_ENABLED deve ser "true" ou "false".',
    );
  }

  if (enabledValue === "false") {
    return ISingleUserRegistrationConfigurationSchema.parse({
      enabled: false,
    });
  }

  const configuration = ISingleUserRegistrationConfigurationSchema.safeParse({
    enabled: true,
    secret: environment.SINGLE_USER_REGISTRATION_SECRET?.trim(),
  });

  if (!configuration.success) {
    throw new Error(
      configuration.error.issues[0]?.message ??
        "SINGLE_USER_REGISTRATION_SECRET invalida.",
    );
  }

  return configuration.data;
}

function validarSegredoCadastroUnico(
  providedSecret: string | undefined,
  expectedSecret: string,
) {
  if (!providedSecret || providedSecret.length > 256) {
    return false;
  }

  const providedDigest = crypto
    .createHash("sha256")
    .update(providedSecret, "utf8")
    .digest();
  const expectedDigest = crypto
    .createHash("sha256")
    .update(expectedSecret, "utf8")
    .digest();

  return crypto.timingSafeEqual(providedDigest, expectedDigest);
}

export { obterConfiguracaoCadastroUnico, validarSegredoCadastroUnico };
