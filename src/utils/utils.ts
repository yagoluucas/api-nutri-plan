function isValidString(text: unknown): text is string {
    return typeof text === "string" && text !== "null" && text !== "undefined" && text.trim().length > 0
}

function formatDateOnly(date?: Date | string): string | undefined {
  if (!date) {
    return undefined;
  }

  if (date instanceof Date) {
    return Number.isNaN(date.getTime())
      ? undefined
      : date.toISOString().slice(0, 10);
  }

  const normalizedDate = date.trim();

  if (!normalizedDate) {
    return undefined;
  }

  const isoDateOnlyMatch = normalizedDate.match(/^\d{4}-\d{2}-\d{2}/);

  if (isoDateOnlyMatch) {
    return isoDateOnlyMatch[0];
  }

  const parsedDate = new Date(normalizedDate);

  return Number.isNaN(parsedDate.getTime())
    ? undefined
    : parsedDate.toISOString().slice(0, 10);
}

export { isValidString, formatDateOnly }
