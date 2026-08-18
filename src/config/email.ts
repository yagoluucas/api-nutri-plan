import { z } from "zod";

const IEmailUserSchema = z.string().trim().toLowerCase().email();
const IEmailAppPasswordSchema = z
  .string()
  .transform((value) => value.replace(/\s/g, ""))
  .pipe(
    z
      .string()
      .regex(
        /^[A-Za-z0-9]{16}$/,
        "EMAIL_APP_PASSWORD deve ser uma senha de app do Google com 16 caracteres.",
      ),
  );
const IFrontendUrlSchema = z
  .url()
  .refine(
    (value) => value.startsWith("http://") || value.startsWith("https://"),
    "FRONTEND_URL deve usar HTTP ou HTTPS.",
  )
  .transform((value) => value.replace(/\/+$/, ""));

function validarConfiguracaoEmail(
  environment: NodeJS.ProcessEnv = process.env,
) {
  const emailUser = IEmailUserSchema.safeParse(environment.EMAIL_USER);
  const emailAppPassword = IEmailAppPasswordSchema.safeParse(
    environment.EMAIL_APP_PASSWORD,
  );
  const frontendUrl = IFrontendUrlSchema.safeParse(environment.FRONTEND_URL);

  if (!emailUser.success) {
    throw new Error("EMAIL_USER nao configurado ou invalido.");
  }

  if (!emailAppPassword.success) {
    throw new Error(
      emailAppPassword.error.issues[0]?.message ??
        "EMAIL_APP_PASSWORD nao configurada ou invalida.",
    );
  }

  if (!frontendUrl.success) {
    throw new Error("FRONTEND_URL nao configurada ou invalida.");
  }

  if (
    environment.NODE_ENV?.trim().toLowerCase() === "production" &&
    !frontendUrl.data.startsWith("https://")
  ) {
    throw new Error("FRONTEND_URL deve usar HTTPS em producao.");
  }

  return {
    emailUser: emailUser.data,
    emailAppPassword: emailAppPassword.data,
    frontendUrl: frontendUrl.data,
  } as const;
}

export { validarConfiguracaoEmail };
