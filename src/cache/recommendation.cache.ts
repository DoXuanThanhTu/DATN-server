import Redis from "ioredis";

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

export const TTL = {
  HYBRID_RESULT: 10 * 60,
  TRENDING: 60 * 60,
  TFIDF_VECTOR: 60 * 60 * 2,
  PRECOMPUTED: 60 * 60 * 6,
};

export const CacheKey = {
  hybrid: (itemId: string) => `rec:hybrid:${itemId}`,
  content: (itemId: string) => `rec:content:${itemId}`,
  collaborative: (itemId: string) => `rec:collab:${itemId}`,
  trending: (categoryId: string) => `rec:trending:${categoryId}`,
  forUser: (userId: string) => `for_user:${userId}`,
  tfidfVector: (itemId: string) => `rec:tfidf:${itemId}`,
};

export async function cacheOrFetch<T>(
  key: string,
  ttl: number,
  fallback: () => Promise<T>,
): Promise<T> {
  const redis = getRedis();

  try {
    const cached = await redis.get(key);
    if (cached) {
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
