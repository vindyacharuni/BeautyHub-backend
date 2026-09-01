import redisClient from "../config/redis.js";

/**
 * Middleware for Redis Caching.
 * @param {string|function} keyPrefixOrFn - Cache key prefix or function returning dynamic key
 * @param {number} ttlSeconds - Time-To-Live in seconds (default 300)
 */
export function cacheMiddleware(keyPrefixOrFn, ttlSeconds = 300) {
    return async (req, res, next) => {
        let key;
        const role = req.user?.role || "guest";

        if (typeof keyPrefixOrFn === "function") {
            key = keyPrefixOrFn(req);
        } else {
            key = `${keyPrefixOrFn}:${req.originalUrl}:${role}`;
        }

        try {
            const cachedData = await redisClient.get(key);
            if (cachedData) {
                console.log(`[CACHE HIT] ${req.method} ${req.originalUrl} (Key: ${key})`);
                return res.json(JSON.parse(cachedData));
            }
        } catch (error) {
            console.error(`[CACHE ERROR] Redis GET failed for key "${key}":`, error.message);
            return next();
        }

        console.log(`[CACHE MISS] ${req.method} ${req.originalUrl} (Key: ${key})`);

        const originalJson = res.json.bind(res);
        res.json = (body) => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                redisClient.set(key, JSON.stringify(body), "EX", ttlSeconds).catch((err) => {
                    console.error(`[CACHE ERROR] Redis SET failed for key "${key}":`, err.message);
                });
            }
            return originalJson(body);
        };

        next();
    };
}

/**
 * Invalidate Redis cache entries matching a pattern (e.g. 'products:*')
 * @param {string} pattern - Key pattern to delete
 */
export async function invalidateCache(pattern) {
    try {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
            await redisClient.del(keys);
            console.log(`[CACHE INVALIDATED] Cleared ${keys.length} key(s) matching pattern: '${pattern}'`);
        } else {
            console.log(`[CACHE INVALIDATED] No keys found matching pattern: '${pattern}'`);
        }
    } catch (error) {
        console.error(`[CACHE INVALIDATION ERROR] Failed to clear keys for pattern '${pattern}':`, error.message);
    }
}
