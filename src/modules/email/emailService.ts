import { Resend } from "resend";
import { obterConfiguracaoResend } from "../../config/email.js";
import {
  IEmailDeliveryResult,
  IEmailDeliveryResultSchema,
  IEmailMessage,
  IEmailMessageSchema,
  IEmailProviderErrorCode,
} from "../../interfaces/email/emailInterfaces.js";
import { logger } from "../../utils/logger.js";

type ResendPayload = {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
};

type ResendResponse = {
  data: unknown;
  error: unknown;
};

type SendWithResend = (
  apiKey: string,
  payload: ResendPayload,
) => Promise<ResendResponse>;

type EmailLogger = Pick<typeof logger, "error" | "info">;

type EmailServiceOptions = {
  environment?: NodeJS.ProcessEnv;
  sendWithResend?: SendWithResend;
  emailLogger?: EmailLogger;
};

class EmailProviderError extends Error {
  readonly code: IEmailProviderErrorCode;

  constructor(code: IEmailProviderErrorCode) {
    super("Servico de e-mail temporariamente indisponivel.");
    this.name = "EmailProviderError";
    this.code = code;
  }
}

async function sendWithResendSdk(
  apiKey: string,
  payload: ResendPayload,
): Promise<ResendResponse> {
  const resend = new Resend(apiKey);
  return resend.emails.send(payload);
}

function createEmailService(options: EmailServiceOptions = {}) {
  const emailLogger = options.emailLogger ?? logger;
  const providerSender = options.sendWithResend ?? sendWithResendSdk;

  function providerError(
    code: IEmailProviderErrorCode,
    emailType: IEmailMessage["type"],
    reason: string,
  ) {
    emailLogger.error(
      "email_delivery_failed",
      undefined,
      {
        emailProvider: "resend",
        emailType,
        status: "failed",
        reason,
      },
    );

    return new EmailProviderError(code);
  }

  return {
    async send(message: IEmailMessage): Promise<IEmailDeliveryResult> {
      const safeMessage = IEmailMessageSchema.parse(message);
      const configuration = obterConfiguracaoResend(
        options.environment ?? process.env,
      );

      if (!configuration.success) {
        const code =
          configuration.reason === "provider-not-configured"
            ? "EMAIL_PROVIDER_NOT_CONFIGURED"
            : "EMAIL_PROVIDER_INVALID_CONFIGURATION";

        throw providerError(code, safeMessage.type, configuration.reason);
      }

      let response: ResendResponse;

      try {
        response = await providerSender(configuration.data.apiKey, {
          from: `${configuration.data.fromName} <${configuration.data.fromEmail}>`,
          to: safeMessage.to,
          subject: safeMessage.subject,
          text: safeMessage.text,
          html: safeMessage.html,
        });
      } catch {
        throw providerError(
          "EMAIL_PROVIDER_SEND_FAILED",
          safeMessage.type,
          "provider-request-failed",
        );
      }

      if (response.error !== null && response.error !== undefined) {
        throw providerError(
          "EMAIL_PROVIDER_SEND_FAILED",
          safeMessage.type,
          "provider-returned-error",
        );
      }

      const deliveryResult = IEmailDeliveryResultSchema.safeParse(
        response.data,
      );

      if (!deliveryResult.success) {
        throw providerError(
          "EMAIL_PROVIDER_INVALID_RESPONSE",
          safeMessage.type,
          "invalid-provider-response",
        );
      }

      emailLogger.info("email_delivery_succeeded", {
        emailProvider: "resend",
        emailType: safeMessage.type,
        status: "sent",
      });

      return deliveryResult.data;
    },
  };
}

const emailService = createEmailService();

export { EmailProviderError, createEmailService, emailService };
