import crypto from "node:crypto";

function getSearchHashKey(): Buffer {
  const searchHashKey = process.env.SEARCH_HASH_KEY;

  if (!searchHashKey || !/^[a-fA-F0-9]{64}$/.test(searchHashKey)) {
    throw new Error(
      "SEARCH_HASH_KEY deve conter exatamente 32 bytes em hexadecimal.",
    );
  }

  const normalizedSearchHashKey = searchHashKey.toLowerCase();

  if (
    normalizedSearchHashKey === process.env.JWT_SECRET?.toLowerCase() ||
    normalizedSearchHashKey === process.env.JWT_REFRESH_SECRET?.toLowerCase() ||
    normalizedSearchHashKey === process.env.ENCRYPTION_KEY?.toLowerCase()
  ) {
    throw new Error(
      "SEARCH_HASH_KEY deve ser exclusiva e diferente das demais chaves do ambiente.",
    );
  }

  return Buffer.from(normalizedSearchHashKey, "hex");
}

export function normalizeEmailForSearch(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeCrnForSearch(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function createSearchHash(normalizedValue: string) {
  return crypto
    .createHmac("sha256", getSearchHashKey())
    .update(normalizedValue, "utf8")
    .digest("hex");
}
