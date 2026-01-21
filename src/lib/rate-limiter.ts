/**
 * Simple in-memory rate limiter for API endpoints
 * For production, consider using Redis or Upstash Rate Limiter
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Store rate limit data in memory
// Key format: "endpoint:identifier"
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed
   */
  maxRequests: number;

  /**
   * Time window in seconds
   */
  windowSeconds: number;

  /**
   * Endpoint identifier (e.g., "create-paypal-order")
   */
  endpoint: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

/**
 * Check if a request is within rate limits
 * @param identifier - Unique identifier (usually user ID or IP address)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const key = `${config.endpoint}:${identifier}`;
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;

  let entry = rateLimitStore.get(key);

  // If entry doesn't exist or has expired, create new one
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 1,
      resetAt: now + windowMs,
    };
    rateLimitStore.set(key, entry);

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: entry.resetAt,
    };
  }

  // Increment count
  entry.count++;

  // Check if limit exceeded
  if (entry.count > config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Rate limit configurations for different endpoints
 */
export const RateLimits = {
  // Payment endpoints - strict limits
  PAYMENT_CREATE: {
    endpoint: 'payment-create',
    maxRequests: 10, // 10 requests
    windowSeconds: 300, // per 5 minutes
  },
  PAYMENT_CAPTURE: {
    endpoint: 'payment-capture',
    maxRequests: 5, // 5 requests
    windowSeconds: 300, // per 5 minutes
  },

  // Cart operations - moderate limits
  CART_ADD: {
    endpoint: 'cart-add',
    maxRequests: 30, // 30 requests
    windowSeconds: 60, // per minute
  },

  // Address operations - moderate limits
  ADDRESS_CREATE: {
    endpoint: 'address-create',
    maxRequests: 10, // 10 requests
    windowSeconds: 300, // per 5 minutes
  },

  // Order operations - strict limits
  ORDER_CREATE: {
    endpoint: 'order-create',
    maxRequests: 5, // 5 requests
    windowSeconds: 600, // per 10 minutes
  },
} as const;

/**
 * Helper to get rate limit headers for HTTP responses
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
  };

  if (result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString();
  }

  return headers;
}
