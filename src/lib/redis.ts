import { Redis } from "@upstash/redis";
import "dotenv/config";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Cache keys
const CACHE_KEYS = {
  ANALYTICS: "admin:analytics",
  USERS: "admin:users",
};

// Cache TTL (in seconds)
const CACHE_TTL = {
  ANALYTICS: 300, // 5 minutes
  USERS: 60, // 1 minute
};

export async function getCachedAnalytics<T>(): Promise<T | null> {
  try {
    const cached = await redis.get<T>(CACHE_KEYS.ANALYTICS);
    return cached;
  } catch (error) {
    console.error("Redis get error:", error);
    return null;
  }
}

export async function setCachedAnalytics<T>(data: T): Promise<void> {
  try {
    await redis.setex(CACHE_KEYS.ANALYTICS, CACHE_TTL.ANALYTICS, data);
  } catch (error) {
    console.error("Redis set error:", error);
  }
}

export async function getCachedUsers<T>(): Promise<T | null> {
  try {
    const cached = await redis.get<T>(CACHE_KEYS.USERS);
    return cached;
  } catch (error) {
    console.error("Redis get error:", error);
    return null;
  }
}

export async function setCachedUsers<T>(data: T): Promise<void> {
  try {
    await redis.setex(CACHE_KEYS.USERS, CACHE_TTL.USERS, data);
  } catch (error) {
    console.error("Redis set error:", error);
  }
}

export async function invalidateCache(key?: string): Promise<void> {
  try {
    if (key) {
      await redis.del(key);
    } else {
      // Invalidate all admin cache
      await redis.del(CACHE_KEYS.ANALYTICS, CACHE_KEYS.USERS);
    }
  } catch (error) {
    console.error("Redis delete error:", error);
  }
}

// Track admin activity
export async function trackAdminActivity(
  userId: string,
  action: string,
  details?: string
): Promise<void> {
  try {
    const timestamp = new Date().toISOString();
    const key = `admin:activity:${userId}`;
    const activity = {
      action,
      details,
      timestamp,
    };

    // Store the last 100 activities per user
    await redis.lpush(key, JSON.stringify(activity));
    await redis.ltrim(key, 0, 99);
  } catch (error) {
    console.error("Redis activity tracking error:", error);
  }
}

export async function getAdminActivity(userId: string, limit = 20) {
  try {
    const key = `admin:activity:${userId}`;
    const activities = await redis.lrange(key, 0, limit - 1);
    return activities.map((item) => JSON.parse(item as string));
  } catch (error) {
    console.error("Redis activity get error:", error);
    return [];
  }
}
