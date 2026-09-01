import { logAuthEvent as winstonLogAuthEvent } from "../config/logger.js";

/**
 * Utility wrapper redirecting auth logging to Winston structured logger.
 */
export function logAuthEvent({ event, email, ip = "UNKNOWN", status = "SUCCESS", details = "" }) {
    winstonLogAuthEvent({ event, email, ip, status, details });
}
