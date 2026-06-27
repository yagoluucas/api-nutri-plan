import type { CorsOptions } from "cors";
import type { IErrorCause } from "../interfaces/errors/erros.js";

const LOCAL_DEVELOPMENT_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
];

function normalizeOrigin(origin: string) {
    return origin.trim().replace(/\/+$/, "");
}

function parseOrigins(...values: Array<string | undefined>) {
    return values
        .flatMap((value) => value?.split(",") ?? [])
        .map(normalizeOrigin)
        .filter(Boolean);
}

function parseBoolean(value: string | undefined) {
    return value === "true" || value === "1";
}

const configuredOrigins = parseOrigins(
    process.env.CORS_ORIGINS,
    process.env.CORS_ORIGIN,
    process.env.FRONTEND_URL
);

const allowedOrigins = new Set([
    ...configuredOrigins,
    ...(process.env.NODE_ENV === "production" ? [] : LOCAL_DEVELOPMENT_ORIGINS),
]);

const allowAnyOrigin = allowedOrigins.has("*");

export const corsOptions: CorsOptions = {
    origin(origin, callback) {
        if (!origin) {
            callback(null, true);
            return;
        }

        const normalizedOrigin = normalizeOrigin(origin);

        if (allowAnyOrigin || allowedOrigins.has(normalizedOrigin)) {
            callback(null, true);
            return;
        }

        callback(new Error("Origem nao permitida pelo CORS", {
            cause: { cause: "Forbidden", statusCode: 403 } as IErrorCause,
        }));
    },
    credentials: parseBoolean(process.env.CORS_CREDENTIALS),
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204,
};
