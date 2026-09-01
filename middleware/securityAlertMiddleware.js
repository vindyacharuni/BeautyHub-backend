import { logSecurityAlert } from "../config/logger.js";

// In-memory rolling window trackers for 401s and 500s per IP
const unauthorizedTracker = new Map(); // IP -> Array<timestamp>
const serverErrorTracker = new Map();   // IP -> Array<timestamp>

const WINDOW_MS = 5 * 60 * 1000; // 5-minute rolling window
const UNAUTH_THRESHOLD = 5;       // Trigger alert on 5+ 401s
const ERROR_THRESHOLD = 3;        // Trigger alert on 3+ 500s

function cleanOldTimestamps(timestamps, now) {
    return timestamps.filter(ts => now - ts < WINDOW_MS);
}

/**
 * Middleware monitoring HTTP response status codes per IP.
 * Triggers security alerts when repeated 401 Unauthorized or 500 Internal Server Errors are detected.
 */
export function securityAlertMiddleware(req, res, next) {
    res.on("finish", () => {
        const clientIp = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "UNKNOWN";
        const statusCode = res.statusCode;
        const now = Date.now();

        // 1. Track 401 Unauthorized Responses
        if (statusCode === 401) {
            let timestamps = unauthorizedTracker.get(clientIp) || [];
            timestamps = cleanOldTimestamps(timestamps, now);
            timestamps.push(now);
            unauthorizedTracker.set(clientIp, timestamps);

            if (timestamps.length >= UNAUTH_THRESHOLD) {
                logSecurityAlert({
                    alertType: "REPEATED_UNAUTHORIZED_401",
                    ip: clientIp,
                    count: timestamps.length,
                    threshold: UNAUTH_THRESHOLD,
                    details: `Suspicious activity: ${timestamps.length} 401 Unauthorized responses from IP ${clientIp} in 5 minutes`
                });
            }
        }

        // 2. Track 5xx Internal Server Error Responses
        if (statusCode >= 500) {
            let timestamps = serverErrorTracker.get(clientIp) || [];
            timestamps = cleanOldTimestamps(timestamps, now);
            timestamps.push(now);
            serverErrorTracker.set(clientIp, timestamps);

            if (timestamps.length >= ERROR_THRESHOLD) {
                logSecurityAlert({
                    alertType: "REPEATED_SERVER_ERROR_500",
                    ip: clientIp,
                    count: timestamps.length,
                    threshold: ERROR_THRESHOLD,
                    details: `High server failure rate: ${timestamps.length} 5xx server errors generated from IP ${clientIp} in 5 minutes`
                });
            }
        }
    });

    next();
}
