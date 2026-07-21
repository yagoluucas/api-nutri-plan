import { createClient } from "redis";
import { z } from "zod";
import { logger } from "../utils/logger.js";

const redisEnvironmentSchema = z.object({
  REDIS_URL: z
    .string()
    .trim()
    .regex(/^rediss?:\/\//, "REDIS_URL invalida."),
});

const redisEnvironment = redisEnvironmentSchema.safeParse({
  REDIS_URL: process.env.REDIS_URL,
});

if (!redisEnvironment.success) {
  throw new Error("REDIS_URL nao configurada ou invalida.");
}

const redisClient = createClient({
  url: redisEnvironment.data.REDIS_URL,
});

redisClient.on("error", () => {
  logger.error("redis_client_error", new Error("Falha na conexao com o Redis."));
});

let connectionPromise: Promise<void> | undefined;

async function getRedisClient() {
  if (redisClient.isReady) {
    return redisClient;
  }

  if (!connectionPromise) {
    connectionPromise = redisClient
      .connect()
      .then(() => undefined)
      .catch((error) => {
        connectionPromise = undefined;
        throw error;
      });
  }

  await connectionPromise;
  return redisClient;
}

export { getRedisClient };
