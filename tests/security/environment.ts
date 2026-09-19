import { randomBytes } from "node:crypto";

// Fresh, test-only keys. Never load a developer .env or production credentials.
export function configureSecurityEnvironment() {
  process.env.NODE_ENV = "test";
  for (const key of ["ENCRYPTION_KEY", "SEARCH_HASH_KEY", "JWT_SECRET", "JWT_REFRESH_SECRET"]) {
    process.env[key] = randomBytes(32).toString("hex");
  }
}
