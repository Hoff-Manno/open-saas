// Rate Limiting System
import { RateLimitError, ErrorCode } from './errors';

// Rate limit configuration
interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (userId: string, action: string) => string;
}

// Default rate limit configurations
export const RateLimits: Record<string, RateLimitConfig> = {
  PDF_UPLOAD: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5, // 5 uploads per minute
  },
  PDF_PROCESSING: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 10, // 10 processing requests per 5 minutes
  },
  MODULE_CREATION: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 3, // 3 module creations per minute
  },
  PROGRESS_UPDATE: {
    windowMs: 10 * 1000, // 10 seconds
    maxRequests: 20, // 20 progress updates per 10 seconds
  },
  API_GENERAL: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 API calls per minute
  },
  TEAM_INVITATION: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 50, // 50 invitations per hour
  },
};

// In-memory rate limit store (in production, use Redis)
class MemoryRateLimitStore {
  private store = new Map<string, { count: number; resetTime: number }>();

  async get(key: string): Promise<{ count: number; resetTime: number } | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    
    // Clean up expired entries
    if (Date.now() > entry.resetTime) {
      this.store.delete(key);
      return null;
    }
    
    return entry;
  }

  async set(key: string, count: number, resetTime: number): Promise<void> {
    this.store.set(key, { count, resetTime });
  }

  async increment(key: string, windowMs: number): Promise<{ count: number; resetTime: number }> {
    const now = Date.now();
    const existing = await this.get(key);
    
    if (!existing) {
      const entry = { count: 1, resetTime: now + windowMs };
      await this.set(key, entry.count, entry.resetTime);
      return entry;
    }
    
    const newCount = existing.count + 1;
    await this.set(key, newCount, existing.resetTime);
    return { count: newCount, resetTime: existing.resetTime };
  }

  // Cleanup expired entries periodically
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

// Global rate limit store instance
const rateLimitStore = new MemoryRateLimitStore();

// Cleanup expired entries every 5 minutes
setInterval(() => {
  rateLimitStore.cleanup();
}, 5 * 60 * 1000);

// Rate limiting function
export async function checkRateLimit(
  userId: string,
  action: string,
  customConfig?: Partial<RateLimitConfig>
): Promise<void> {
  const config = { ...RateLimits[action], ...customConfig };
  
  if (!config) {
    throw new Error(`Rate limit configuration not found for action: ${action}`);
  }

  const key = config.keyGenerator 
    ? config.keyGenerator(userId, action)
    : `${userId}:${action}`;

  const result = await rateLimitStore.increment(key, config.windowMs);
  
  if (result.count > config.maxRequests) {
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
    throw new RateLimitError(
      `Rate limit exceeded for ${action}. Try again in ${retryAfter} seconds.`,
      retryAfter
    );
  }
}

// Rate limit middleware for operations
export function withRateLimit(action: string, customConfig?: Partial<RateLimitConfig>) {
  return function <T extends (...args: any[]) => any>(
    target: any,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const method = descriptor.value!;
    
    descriptor.value = (async function (this: any, ...args: any[]) {
      // Extract user ID from context (assuming it's the second parameter)
      const context = args[1];
      if (!context?.user?.id) {
        throw new Error('Rate limiting requires authenticated user context');
      }
      
      await checkRateLimit(context.user.id, action, customConfig);
      return method.apply(this, args);
    }) as T;
    
    return descriptor;
  };
}

// Burst rate limiting for high-frequency operations
export class BurstRateLimiter {
  private buckets = new Map<string, { tokens: number; lastRefill: number }>();
  
  constructor(
    private maxTokens: number,
    private refillRate: number, // tokens per second
    private burstSize: number = maxTokens
  ) {}

  async checkLimit(userId: string, tokensRequired: number = 1): Promise<void> {
    const key = `burst:${userId}`;
    const now = Date.now();
    
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { tokens: this.maxTokens, lastRefill: now };
      this.buckets.set(key, bucket);
    }
    
    // Refill tokens based on time elapsed
    const timePassed = (now - bucket.lastRefill) / 1000;
    const tokensToAdd = Math.floor(timePassed * this.refillRate);
    bucket.tokens = Math.min(this.maxTokens, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
    
    if (bucket.tokens < tokensRequired) {
      const waitTime = Math.ceil((tokensRequired - bucket.tokens) / this.refillRate);
      throw new RateLimitError(
        `Burst rate limit exceeded. Try again in ${waitTime} seconds.`,
        waitTime
      );
    }
    
    bucket.tokens -= tokensRequired;
  }
}

// Specialized rate limiters
export const pdfProcessingLimiter = new BurstRateLimiter(
  10, // 10 tokens max
  0.1, // 1 token per 10 seconds
  5    // burst of 5
);

export const uploadLimiter = new BurstRateLimiter(
  20, // 20 tokens max
  0.5, // 1 token per 2 seconds
  10   // burst of 10
);

// Rate limit status for client-side display
export interface RateLimitStatus {
  action: string;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export async function getRateLimitStatus(
  userId: string,
  action: string
): Promise<RateLimitStatus> {
  const config = RateLimits[action];
  if (!config) {
    throw new Error(`Rate limit configuration not found for action: ${action}`);
  }

  const key = `${userId}:${action}`;
  const entry = await rateLimitStore.get(key);
  
  if (!entry) {
    return {
      action,
      remaining: config.maxRequests,
      resetTime: Date.now() + config.windowMs,
    };
  }
  
  const remaining = Math.max(0, config.maxRequests - entry.count);
  const status: RateLimitStatus = {
    action,
    remaining,
    resetTime: entry.resetTime,
  };
  
  if (remaining === 0) {
    status.retryAfter = Math.ceil((entry.resetTime - Date.now()) / 1000);
  }
  
  return status;
}

// Helper to check multiple rate limits at once
export async function checkMultipleRateLimits(
  userId: string,
  actions: Array<{ action: string; config?: Partial<RateLimitConfig> }>
): Promise<void> {
  for (const { action, config } of actions) {
    await checkRateLimit(userId, action, config);
  }
}

// Rate limit reset (for testing or admin override)
export async function resetRateLimit(userId: string, action: string): Promise<void> {
  const key = `${userId}:${action}`;
  rateLimitStore.store.delete(key);
}

// Get all rate limit statuses for a user
export async function getAllRateLimitStatuses(userId: string): Promise<RateLimitStatus[]> {
  const statuses: RateLimitStatus[] = [];
  
  for (const action of Object.keys(RateLimits)) {
    try {
      const status = await getRateLimitStatus(userId, action);
      statuses.push(status);
    } catch (error) {
      console.error(`Error getting rate limit status for ${action}:`, error);
    }
  }
  
  return statuses;
}