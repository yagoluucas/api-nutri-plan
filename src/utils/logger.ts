type LogLevel = "info" | "warn" | "error";
type LogMetadata = Record<string, unknown>;
type ConsoleMethod = (...data: unknown[]) => void;

const REDACTED = "[REDACTED]";
const MAX_STRING_LENGTH = 1_000;
const MAX_ARRAY_ITEMS = 20;
const MAX_DEPTH = 5;

const nativeConsole = {
  log: console.log.bind(console) as ConsoleMethod,
  info: console.info.bind(console) as ConsoleMethod,
  warn: console.warn.bind(console) as ConsoleMethod,
  error: console.error.bind(console) as ConsoleMethod,
  debug: console.debug.bind(console) as ConsoleMethod,
};

let consoleRedactionInstalled = false;

const SENSITIVE_KEYS = new Set([
  "authorization",
  "proxyauthorization",
  "cookie",
  "setcookie",
  "password",
  "passwordconfirmation",
  "senha",
  "confirmacaosenha",
  "token",
  "accesstoken",
  "refreshtoken",
  "jwt",
  "jwtsecret",
  "secret",
  "encryptionkey",
  "emailuser",
  "emailapppassword",
  "confirmationtoken",
  "confirmationtokenhash",
  "registrationdataencrypted",
  "passwordhash",
  "emailhash",
  "crnhash",
  "initialiphash",
  "lastiphash",
  "ip",
  "requestip",
  "remoteaddress",
  "mongodbconnectionstring",
  "mongourl",
  "email",
  "datanascimento",
  "observacoes",
  "observacoesgerais",
  "objetivodoplano",
  "refeicoes",
  "planosalimentares",
  "imagemperfil",
  "imagemcapa",
]);

const TOKEN_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const MONGO_URI_PATTERN = /mongodb(?:\+srv)?:\/\/[^\s"']+/gi;
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function redactString(value: string): string {
  const redacted = value
    .replace(TOKEN_PATTERN, `Bearer ${REDACTED}`)
    .replace(JWT_PATTERN, REDACTED)
    .replace(MONGO_URI_PATTERN, REDACTED)
    .replace(EMAIL_PATTERN, REDACTED)
    .replace(/[\r\n\t]+/g, " ");

  return redacted.length > MAX_STRING_LENGTH
    ? `${redacted.slice(0, MAX_STRING_LENGTH)}...[TRUNCATED]`
    : redacted;
}

function sanitize(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (depth > MAX_DEPTH) {
    return "[MAX_DEPTH]";
  }

  if (typeof value === "string") {
    return redactString(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "function" || typeof value === "symbol") {
    return String(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Error) {
    const sanitizedError: LogMetadata = {
      name: value.name,
      message: redactString(value.message),
    };

    if (process.env.NODE_ENV !== "production" && value.stack) {
      sanitizedError.stack = redactString(value.stack);
    }

    if (value.cause !== undefined) {
      sanitizedError.cause = sanitize(value.cause, depth + 1, seen);
    }

    return sanitizedError;
  }

  if (typeof value === "object") {
    if (seen.has(value)) {
      return "[CIRCULAR]";
    }

    seen.add(value);

    if (Array.isArray(value)) {
      return value
        .slice(0, MAX_ARRAY_ITEMS)
        .map((item) => sanitize(item, depth + 1, seen));
    }

    const sanitizedObject: LogMetadata = {};

    for (const [key, childValue] of Object.entries(value)) {
      sanitizedObject[key] = SENSITIVE_KEYS.has(normalizeKey(key))
        ? REDACTED
        : sanitize(childValue, depth + 1, seen);
    }

    return sanitizedObject;
  }

  return redactString(String(value));
}

function installConsoleRedaction(): void {
  if (consoleRedactionInstalled) {
    return;
  }

  consoleRedactionInstalled = true;

  console.log = (...data: unknown[]) => nativeConsole.log(...data.map((item) => sanitize(item)));
  console.info = (...data: unknown[]) => nativeConsole.info(...data.map((item) => sanitize(item)));
  console.warn = (...data: unknown[]) => nativeConsole.warn(...data.map((item) => sanitize(item)));
  console.error = (...data: unknown[]) => nativeConsole.error(...data.map((item) => sanitize(item)));
  console.debug = (...data: unknown[]) => nativeConsole.debug(...data.map((item) => sanitize(item)));
}

function writeLog(level: LogLevel, event: string, metadata?: LogMetadata): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event: redactString(event),
    ...(metadata ? { metadata: sanitize(metadata) } : {}),
  };

  const serialized = JSON.stringify(entry);

  if (level === "error") {
    nativeConsole.error(serialized);
    return;
  }

  if (level === "warn") {
    nativeConsole.warn(serialized);
    return;
  }

  nativeConsole.info(serialized);
}

const logger = {
  info(event: string, metadata?: LogMetadata) {
    writeLog("info", event, metadata);
  },
  warn(event: string, metadata?: LogMetadata) {
    writeLog("warn", event, metadata);
  },
  error(event: string, error?: unknown, metadata?: LogMetadata) {
    writeLog("error", event, {
      ...(metadata ?? {}),
      ...(error === undefined ? {} : { error }),
    });
  },
};

export { installConsoleRedaction, logger, sanitize };
