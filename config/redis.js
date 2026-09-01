import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

const redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
        const delay = Math.min(times * 100, 3000);
        return delay;
    }
});

redisClient.on("connect", () => {
    console.log("Connected to Redis server");
});

redisClient.on("error", (err) => {
    console.error("Redis Client Error:", err.message);
});

export default redisClient;
