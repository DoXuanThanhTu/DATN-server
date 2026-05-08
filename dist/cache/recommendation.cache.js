"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheKey = exports.TTL = void 0;
exports.getRedis = getRedis;
exports.cacheOrFetch = cacheOrFetch;
exports.invalidateItem = invalidateItem;
exports.getPrecomputed = getPrecomputed;
exports.setPrecomputed = setPrecomputed;
const ioredis_1 = __importDefault(require("ioredis"));
/**
 * =====================================
 * REDIS CLIENT
 * Kết nối singleton, tự reconnect
 * =====================================
 */
let redisClient = null;
function getRedis() {
    if (!redisClient) {
        redisClient = new ioredis_1.default({
            host: process.env.REDIS_HOST || "localhost",
            port: Number(process.env.REDIS_PORT) || 6379,
            password: process.env.REDIS_PASSWORD,
            retryStrategy: (times) => Math.min(times * 100, 3000),
            lazyConnect: true,
        });
        redisClient.on("error", (err) => {
            console.error("[Redis] Connection error:", err.message);
        });
    }
    return redisClient;
}
/**
 * =====================================
 * TTL CONSTANTS (seconds)
 * =====================================
 */
exports.TTL = {
    /** Kết quả hybrid cho từng item — cache 30 phút */
    HYBRID_RESULT: 10 * 60,
    /** Trending items cùng category — cache 1 tiếng */
    TRENDING: 60 * 60,
    /** TF-IDF vector của 1 post — cache 2 tiếng */
    TFIDF_VECTOR: 60 * 60 * 2,
    /** Precomputed recommendations — cache 6 tiếng */
    PRECOMPUTED: 60 * 60 * 6,
};
/**
 * =====================================
 * KEY BUILDERS
 * =====================================
 */
exports.CacheKey = {
    hybrid: (itemId) => `rec:hybrid:${itemId}`,
    content: (itemId) => `rec:content:${itemId}`,
    collaborative: (itemId) => `rec:collab:${itemId}`,
    trending: (categoryId) => `rec:trending:${categoryId}`,
    forUser: (userId) => `for_user:${userId}`,
    tfidfVector: (itemId) => `rec:tfidf:${itemId}`,
};
/**
 * =====================================
 * GENERIC CACHE HELPERS
 * =====================================
 */
async function cacheOrFetch(key, ttl, fallback) {
    const redis = getRedis();
    try {
        const cached = await redis.get(key);
        if (cached) {
            // console.log("cached", key, cached, "\n");
            return JSON.parse(cached);
        }
    }
    catch (err) {
        console.warn("[Cache] GET failed, falling back to DB:", err.message);
    }
    const data = await fallback();
    try {
        await redis.set(key, JSON.stringify(data), "EX", ttl);
    }
    catch (err) {
        console.warn("[Cache] SET failed:", err.message);
    }
    return data;
}
async function invalidateItem(itemId) {
    const redis = getRedis();
    const keys = [
        exports.CacheKey.hybrid(itemId),
        exports.CacheKey.content(itemId),
        exports.CacheKey.collaborative(itemId),
        exports.CacheKey.tfidfVector(itemId),
    ];
    try {
        await redis.del(...keys);
        console.log(`[Cache] Invalidated keys for item ${itemId}`);
    }
    catch (err) {
        console.warn("[Cache] Invalidate failed:", err.message);
    }
}
/**
 * Lấy danh sách precomputed recommendations (do cron job set sẵn)
 */
async function getPrecomputed(key) {
    const redis = getRedis();
    try {
        const cached = await redis.get(key);
        return cached ? JSON.parse(cached) : null;
    }
    catch {
        return null;
    }
}
/**
 * Cron job gọi hàm này để lưu precomputed recommendations
 */
async function setPrecomputed(key, data, ttl = exports.TTL.PRECOMPUTED) {
    const redis = getRedis();
    try {
        await redis.set(key, JSON.stringify(data), "EX", ttl);
    }
    catch (err) {
        console.warn("[Cache] setPrecomputed failed:", err.message);
    }
}
