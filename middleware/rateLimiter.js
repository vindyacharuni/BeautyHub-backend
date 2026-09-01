import rateLimit from "express-rate-limit";

/**
 * Rate Limiter for Sensitive Authentication Routes (/login, /register, /forgot-password, /reset-password).
 * Limits each IP to 5 requests per 15-minute window.
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
        message: "Too many authentication attempts from this IP. Please try again after 15 minutes."
    }
});

/**
 * General API Rate Limiter.
 * Limits each IP to 100 requests per 15-minute window.
 */
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: "Too many requests from this IP. Please try again later."
    }
});
