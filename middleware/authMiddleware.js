import jwt from "jsonwebtoken";
import redisClient, { safeRedisGet, safeRedisSet } from "../config/redis.js";
import dotenv from "dotenv";

dotenv.config();

const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET || "cbc-6503";

/**
 * Middleware to verify Bearer Access Token from Authorization header.
 * Checks Redis blacklist and attaches req.user.
 */
export async function verifyToken(req, res, next) {
    const authHeader = req.header("Authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        req.user = null;
        return next();
    }

    const token = authHeader.replace("Bearer ", "").trim();

    try {
        // Check if token is blacklisted in Redis
        const isBlacklisted = await safeRedisGet(`bl_${token}`);
        if (isBlacklisted) {
            req.user = null;
            return res.status(401).json({ message: "Token has been revoked/logged out" });
        }

        const decoded = jwt.verify(token, ACCESS_SECRET);
        req.user = decoded;
        req.token = token;
        next();
    } catch (err) {
        req.user = null;
        return res.status(401).json({ message: "Invalid or expired access token", error: err.message });
    }
}

/**
 * Enforces that user must be authenticated.
 */
export function requireAuth(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ message: "Unauthorized: Authentication required" });
    }
    next();
}

/**
 * Enforces that user must have 'admin' role.
 */
export function requireAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ message: "Unauthorized: Authentication required" });
    }
    if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Admin privilege required" });
    }
    next();
}

/**
 * Helper to check if current user owns a resource or is an admin.
 * @param {object} req - Express request object containing req.user
 * @param {string} ownerEmail - The email associated with the target resource
 * @returns {boolean}
 */
export function isResourceOwnerOrAdmin(req, ownerEmail) {
    if (!req.user) return false;
    if (req.user.role === "admin") return true;
    return Boolean(req.user.email && ownerEmail && req.user.email.toLowerCase() === String(ownerEmail).toLowerCase());
}

/**
 * Blacklists a JWT token in Redis for the specified duration (TTL in seconds).
 */
export async function blacklistToken(token, ttlSeconds = 900) {
    if (!token) return;
    try {
        // Guarantee positive TTL
        const safeTtl = Math.max(ttlSeconds, 60);
        await safeRedisSet(`bl_${token}`, "blacklisted", "EX", safeTtl);
    } catch (error) {
        console.error("Error blacklisting token in Redis:", error.message);
    }
}
