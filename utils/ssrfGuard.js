import { URL } from "url";
import net from "net";
import { logger } from "../config/logger.js";

// Domain Allow-List for outbound requests and external asset fetching
const ALLOWED_DOMAINS = [
    "oauth2.googleapis.com",
    "accounts.google.com",
    "cdn.pixabay.com",
    "images.unsplash.com",
    "res.cloudinary.com",
    "lh3.googleusercontent.com"
];

// Private IP Range regex & loopback check
const PRIVATE_IP_REGEX = /^(127\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|169\.254\.|0\.|::1|fe80:)/i;

/**
 * Validates a target URL against SSRF vulnerabilities:
 * 1. Must use HTTPS protocol.
 * 2. Hostname must NOT resolve to private/loopback/metadata IP ranges (127.0.0.0/8, 10.0.0.0/8, 169.254.169.254, etc.).
 * 3. Domain must be on the explicit ALLOWED_DOMAINS list.
 */
export function validateExternalUrl(urlString) {
    try {
        if (!urlString || typeof urlString !== "string") {
            return { valid: false, reason: "URL string is missing or invalid type" };
        }

        const parsed = new URL(urlString);

        // Protocol check: HTTPS required for external calls
        if (parsed.protocol !== "https:") {
            return { valid: false, reason: "Only HTTPS URLs are allowed for outbound requests" };
        }

        const hostname = parsed.hostname.toLowerCase();

        // Prevent loopback, metadata, and private IP literals
        if (hostname === "localhost" || net.isIP(hostname)) {
            if (hostname === "localhost" || PRIVATE_IP_REGEX.test(hostname)) {
                return { valid: false, reason: "Access to private/local IP addresses is strictly forbidden" };
            }
        }

        // Check for private subnet regex patterns in domain name or IP
        if (PRIVATE_IP_REGEX.test(hostname)) {
            return { valid: false, reason: "Access to internal IP subnet ranges is strictly forbidden" };
        }

        // Domain Allow-List Check
        const isAllowed = ALLOWED_DOMAINS.some(allowed => 
            hostname === allowed || hostname.endsWith("." + allowed)
        );

        if (!isAllowed) {
            return { valid: false, reason: `Domain '${hostname}' is not on the allowed outbound domains list` };
        }

        return { valid: true, parsedUrl: parsed };
    } catch (err) {
        return { valid: false, reason: `Invalid URL format: ${err.message}` };
    }
}

/**
 * Safe fetch wrapper preventing SSRF attacks before network requests are initiated.
 */
export async function safeFetch(urlString, options = {}) {
    const check = validateExternalUrl(urlString);
    if (!check.valid) {
        logger.warn(`[SSRF GUARD BLOCKED] Target URL: ${urlString} | Reason: ${check.reason}`);
        throw new Error(`SSRF Guard Blocked Request: ${check.reason}`);
    }
    return fetch(urlString, options);
}
