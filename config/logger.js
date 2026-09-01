import winston from "winston";
import path from "path";
import fs from "fs";

// Ensure logs directory exists
const logDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Custom format for structured JSON logging
const customJsonFormat = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Console format for development human readability
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(({ level, message, timestamp, ...metadata }) => {
        let metaString = Object.keys(metadata).length ? JSON.stringify(metadata) : "";
        return `[${timestamp}] ${level}: ${message} ${metaString}`;
    })
);

export const logger = winston.createLogger({
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
    format: customJsonFormat,
    defaultMeta: { service: "beautyhub-backend" },
    transports: [
        // Console transport (for Cloud Aggregators like Logtail, Better Stack, Render stdout)
        new winston.transports.Console({
            format: consoleFormat
        }),
        // Persistent Error log file
        new winston.transports.File({
            filename: path.join(logDir, "error.log"),
            level: "error",
            maxsize: 5242880, // 5MB limit
            maxFiles: 5
        }),
        // Persistent Combined log file
        new winston.transports.File({
            filename: path.join(logDir, "combined.log"),
            maxsize: 5242880, // 5MB limit
            maxFiles: 5
        })
    ]
});

/**
 * Log Auth Event
 */
export function logAuthEvent({ event, email, ip = "UNKNOWN", status = "SUCCESS", details = "" }) {
    logger.info(`[AUTH] ${event}`, {
        type: "AUTH_EVENT",
        event,
        email: email || "ANONYMOUS",
        ip,
        status,
        details
    });
}

/**
 * Log Payment / Order Event
 */
export function logOrderEvent({ event, orderId, email, total, status = "SUCCESS", details = "" }) {
    logger.info(`[ORDER] ${event}`, {
        type: "ORDER_EVENT",
        event,
        orderId,
        email,
        total,
        status,
        details
    });
}

/**
 * Log Security Alert
 */
export function logSecurityAlert({ alertType, ip, count, threshold, details = "" }) {
    logger.warn(`[SECURITY ALERT] ${alertType}`, {
        type: "SECURITY_ALERT",
        alertType,
        ip,
        count,
        threshold,
        details
    });
}
