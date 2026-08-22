function parseRetentionDays(name: string, fallback: number) {
  const rawValue = process.env[name];

  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number(rawValue);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${name} deve ser um numero inteiro positivo.`);
  }

  return parsedValue;
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

const archiveRetention = {
  nutricionistaDays: parseRetentionDays(
    "NUTRICIONISTA_ARCHIVE_RETENTION_DAYS",
    30,
  ),
  pacienteDays: parseRetentionDays("PACIENTE_ARCHIVE_RETENTION_DAYS", 365),
  planoAlimentarDays: parseRetentionDays(
    "PLANO_ALIMENTAR_ARCHIVE_RETENTION_DAYS",
    365,
  ),
} as const;

export { addDays, archiveRetention };
