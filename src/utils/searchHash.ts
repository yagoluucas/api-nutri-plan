import crypto from "node:crypto";
import { obterChaveSensivel } from "../config/secrets.js";

function getSearchHashKey(): Buffer {
  return Buffer.from(obterChaveSensivel("SEARCH_HASH_KEY").toLowerCase(), "hex");
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

export function createContextualSearchHash(value: string, context: string) {
  return crypto
    .createHmac("sha256", getSearchHashKey())
    .update(context, "utf8")
    .update("\0", "utf8")
    .update(value, "utf8")
    .digest("hex");
}
