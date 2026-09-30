import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const redisUrl = process.env.REDIS_URL;

let redisClient = null;

if (redisUrl) {
    try {
        redisClient = new Redis(redisUrl, {
            maxRetriesPerRequest: 1,
            enableOfflineQueue: false,
            retryStrategy(times) {
                if (times > 3) return null; // Stop retrying if Redis server is down
                return Math.min(times * 100, 1000);
            }
        });

        redisClient.on("connect", () => {
            console.log("Connected to Redis server");
        });

        redisClient.on("error", (err) => {
            console.warn("Redis Warning (running in offline fallback mode):", err.message);
        });
    } catch (e) {
        console.warn("Failed to initialize Redis client:", e.message);
        redisClient = null;
    }
} else {
    console.log("No REDIS_URL provided. Running backend in memory-fallback mode (Redis disabled).");
}

export const safeRedisGet = async (key) => {
    try {
        if (!redisClient || redisClient.status !== "ready") return null;
        return await redisClient.get(key);
    } catch (e) {
        return null;
    }
};

export const safeRedisSet = async (key, value, mode, duration) => {
    try {
        if (!redisClient || redisClient.status !== "ready") return;
        if (mode && duration) {
            await redisClient.set(key, value, mode, duration);
        } else {
            await redisClient.set(key, value);
        }
    } catch (e) {
        // Ignore redis errors gracefully
    }
};

export default redisClient;
