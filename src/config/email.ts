import { z } from "zod";
import {
  IResendConfiguration,
  IResendConfigurationSchema,
} from "../interfaces/email/emailInterfaces.js";

const IFrontendUrlSchema = z
  .url()
  .refine(
    (value) => value.startsWith("http://") || value.startsWith("https://"),
    "FRONTEND_URL deve usar HTTP ou HTTPS.",
  )
  .transform((value) => value.replace(/\/+$/, ""));

type ResendConfigurationResult =
  | { success: true; data: IResendConfiguration }
  | {
      success: false;
      reason: "provider-not-configured" | "invalid-provider-configuration";
    };

function validarFrontendUrl(
  environment: NodeJS.ProcessEnv = process.env,
) {
  const frontendUrl = IFrontendUrlSchema.safeParse(environment.FRONTEND_URL);

  if (!frontendUrl.success) {
    throw new Error("FRONTEND_URL nao configurada ou invalida.");
  }

  if (
    environment.NODE_ENV?.trim().toLowerCase() === "production" &&
    !frontendUrl.data.startsWith("https://")
  ) {
    throw new Error("FRONTEND_URL deve usar HTTPS em producao.");
  }

  return frontendUrl.data;
}

function obterConfiguracaoResend(
  environment: NodeJS.ProcessEnv = process.env,
): ResendConfigurationResult {
  const apiKey = environment.RESEND_API_KEY?.trim();
  const fromEmail = environment.RESEND_FROM_EMAIL?.trim();

  if (!apiKey || !fromEmail) {
    return { success: false, reason: "provider-not-configured" };
  }

  const configuration = IResendConfigurationSchema.safeParse({
    apiKey,
    fromEmail,
    fromName: environment.RESEND_FROM_NAME?.trim() || "Integrale Nutrição",
  });

  if (!configuration.success) {
    return { success: false, reason: "invalid-provider-configuration" };
  }

  return { success: true, data: configuration.data };
}

export { obterConfiguracaoResend, validarFrontendUrl };
