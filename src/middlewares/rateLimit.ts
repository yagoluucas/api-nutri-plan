import rateLimit from "express-rate-limit";

function rateLimitResponse(message: string) {
    return {
        message,
        error: true,
        statusCode: 429,
    };
}

const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
        return res.status(429).json(rateLimitResponse("Muitas tentativas de login. Tente novamente mais tarde."));
    },
});

const registerRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
        return res.status(429).json(rateLimitResponse("Muitas tentativas de cadastro. Tente novamente mais tarde."));
    },
});

export { loginRateLimiter, registerRateLimiter };
