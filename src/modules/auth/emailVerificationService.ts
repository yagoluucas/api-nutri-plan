import crypto from "node:crypto";
import nodemailer from "nodemailer";
import { validarConfiguracaoEmail } from "../../config/email.js";

const EMAIL_CONFIRMATION_TTL_MS = 30 * 60 * 1_000;
const PENDING_REGISTRATION_RETENTION_MS = 24 * 60 * 60 * 1_000;

let transporter: ReturnType<typeof nodemailer.createTransport> | undefined;

function getEmailTransporter() {
  if (transporter) {
    return transporter;
  }

  const configuration = validarConfiguracaoEmail();

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: configuration.emailUser,
      pass: configuration.emailAppPassword,
    },
  });

  return transporter;
}

function generateConfirmationToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function hashConfirmationToken(token: string) {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

function getConfirmationExpiration(from = new Date()) {
  return new Date(from.getTime() + EMAIL_CONFIRMATION_TTL_MS);
}

function getPendingRegistrationExpiration(from = new Date()) {
  return new Date(from.getTime() + PENDING_REGISTRATION_RETENTION_MS);
}

function buildConfirmationUrl(token: string) {
  const { frontendUrl } = validarConfiguracaoEmail();
  const confirmationUrl = new URL("/confirmar-email", frontendUrl);
  confirmationUrl.hash = new URLSearchParams({ token }).toString();
  return confirmationUrl.toString();
}

async function sendRegistrationConfirmationEmail(
  recipientEmail: string,
  token: string,
) {
  const configuration = validarConfiguracaoEmail();
  const confirmationUrl = buildConfirmationUrl(token);

  await getEmailTransporter().sendMail({
    from: configuration.emailUser,
    to: recipientEmail,
    subject: "Confirme seu e-mail no Nutri Plan",
    text: [
      "Recebemos uma solicitacao de cadastro no Nutri Plan.",
      "",
      `Confirme seu e-mail acessando: ${confirmationUrl}`,
      "",
      "Este link expira em 30 minutos. Se voce nao solicitou o cadastro, ignore esta mensagem.",
    ].join("\n"),
    html: [
      "<p>Recebemos uma solicitacao de cadastro no Nutri Plan.</p>",
      `<p><a href="${confirmationUrl}">Confirmar meu e-mail</a></p>`,
      "<p>Este link expira em 30 minutos. Se voce nao solicitou o cadastro, ignore esta mensagem.</p>",
    ].join(""),
  });
}

export {
  buildConfirmationUrl,
  generateConfirmationToken,
  getConfirmationExpiration,
  getPendingRegistrationExpiration,
  hashConfirmationToken,
  sendRegistrationConfirmationEmail,
};
