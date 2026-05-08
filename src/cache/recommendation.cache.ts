import Redis from "ioredis";

/**
 * =====================================
 * REDIS CLIENT
 * Kết nối singleton, tự reconnect
 * =====================================
 */

let redisClient: Redis | null = null;

export function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis({
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

export const TTL = {
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

export const CacheKey = {
  hybrid: (itemId: string) => `rec:hybrid:${itemId}`,
  content: (itemId: string) => `rec:content:${itemId}`,
  collaborative: (itemId: string) => `rec:collab:${itemId}`,
  trending: (categoryId: string) => `rec:trending:${categoryId}`,
  forUser: (userId: string) => `for_user:${userId}`,
  tfidfVector: (itemId: string) => `rec:tfidf:${itemId}`,
};

/**
 * =====================================
 * GENERIC CACHE HELPERS
 * =====================================
 */

export async function cacheOrFetch<T>(
  key: string,
  ttl: number,
  fallback: () => Promise<T>,
): Promise<T> {
  const redis = getRedis();

  try {
    const cached = await redis.get(key);
    if (cached) {
      // console.log("cached", key, cached, "\n");

      return JSON.parse(cached) as T;
    }
  } catch (err: any) {
    console.warn("[Cache] GET failed, falling back to DB:", err.message);
  }

  const data = await fallback();

  try {
    await redis.set(key, JSON.stringify(data), "EX", ttl);
  } catch (err: any) {
    console.warn("[Cache] SET failed:", err.message);
  }

  return data;
}

export async function invalidateItem(itemId: string): Promise<void> {
  const redis = getRedis();

  const keys = [
    CacheKey.hybrid(itemId),
    CacheKey.content(itemId),
    CacheKey.collaborative(itemId),
    CacheKey.tfidfVector(itemId),
  ];

  try {
    await redis.del(...keys);
    console.log(`[Cache] Invalidated keys for item ${itemId}`);
  } catch (err: any) {
    console.warn("[Cache] Invalidate failed:", err.message);
  }
}

/**
 * Lấy danh sách precomputed recommendations (do cron job set sẵn)
 */
export async function getPrecomputed<T>(key: string): Promise<T | null> {
  const redis = getRedis();

  try {
    const cached = await redis.get(key);

    return cached ? (JSON.parse(cached) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Cron job gọi hàm này để lưu precomputed recommendations
 */
export async function setPrecomputed<T>(
  key: string,
  data: T,
  ttl = TTL.PRECOMPUTED,
): Promise<void> {
  const redis = getRedis();

  try {
    await redis.set(key, JSON.stringify(data), "EX", ttl);
  } catch (err: any) {
    console.warn("[Cache] setPrecomputed failed:", err.message);
  }
}
