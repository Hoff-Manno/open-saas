// Caching utilities for performance optimization
import { type LearningModule, type User, type UserProgress } from 'wasp/entities';

// In-memory cache with TTL
class MemoryCache {
  private cache = new Map<string, { value: any; expiry: number }>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  set(key: string, value: any, ttl?: number): void {
    const expiry = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { value, expiry });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value as T;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

// Singleton cache instance
export const cache = new MemoryCache();

// Cache keys for different data types
export const CacheKeys = {
  LEARNING_ANALYTICS: (organizationId?: string, days?: number) => 
    `learning_analytics:${organizationId || 'all'}:${days || 30}`,
  
  USER_PROGRESS: (userId: string, moduleId?: string) =>
    `user_progress:${userId}:${moduleId || 'all'}`,
    
  MODULE_CONTENT: (moduleId: string) =>
    `module_content:${moduleId}`,
    
  USER_ENGAGEMENT: (userId: string, days?: number) =>
    `user_engagement:${userId}:${days || 7}`,
    
  DASHBOARD_STATS: (organizationId?: string) =>
    `dashboard_stats:${organizationId || 'global'}`,

  MODULE_SECTIONS: (moduleId: string) =>
    `module_sections:${moduleId}`,

  PROCESSED_CONTENT: (fileKey: string) =>
    `processed_content:${fileKey}`,
} as const;

// Cache wrapper for database queries
export function withCache<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    try {
      // Try to get from cache first
      const cached = cache.get<T>(cacheKey);
      if (cached !== null) {
        resolve(cached);
        return;
      }

      // Fetch fresh data
      const data = await fetchFn();
      
      // Cache the result
      cache.set(cacheKey, data, ttl);
      
      resolve(data);
    } catch (error) {
      reject(error);
    }
  });
}

// Cache invalidation helpers
export const CacheInvalidation = {
  // Invalidate when user progress changes
  onProgressUpdate: (userId: string, moduleId: string) => {
    cache.delete(CacheKeys.USER_PROGRESS(userId));
    cache.delete(CacheKeys.USER_PROGRESS(userId, moduleId));
    cache.delete(CacheKeys.USER_ENGAGEMENT(userId));
    cache.delete(CacheKeys.DASHBOARD_STATS());
  },

  // Invalidate when module content changes
  onModuleUpdate: (moduleId: string, organizationId?: string) => {
    cache.delete(CacheKeys.MODULE_CONTENT(moduleId));
    cache.delete(CacheKeys.MODULE_SECTIONS(moduleId));
    cache.delete(CacheKeys.LEARNING_ANALYTICS(organizationId));
    cache.delete(CacheKeys.DASHBOARD_STATS(organizationId));
  },

  // Invalidate when new user activity
  onUserActivity: (userId: string, organizationId?: string) => {
    cache.delete(CacheKeys.USER_ENGAGEMENT(userId));
    cache.delete(CacheKeys.LEARNING_ANALYTICS(organizationId));
    cache.delete(CacheKeys.DASHBOARD_STATS(organizationId));
  },

  // Clear all analytics caches
  clearAnalytics: () => {
    const keys = Array.from((cache as any).cache.keys()) as string[];
    keys.forEach((key: string) => {
      if (key.includes('learning_analytics') || key.includes('dashboard_stats')) {
        cache.delete(key);
      }
    });
  },
} as const;

// Cleanup job - should be called periodically
export const cleanupExpiredCache = () => {
  cache.cleanup();
};

// Client-side caching for frontend
export const ClientCache = {
  // Browser storage keys
  STORAGE_KEYS: {
    PROGRESS_DATA: 'pdf_learning_progress_data',
    MODULE_CONTENT: 'pdf_learning_module_content',
    USER_BOOKMARKS: 'pdf_learning_user_bookmarks',
    RECENT_MODULES: 'pdf_learning_recent_modules',
  },

  // Store data with expiration
  set(key: string, data: any, expiryMinutes = 30) {
    if (typeof window !== 'undefined') {
      const expiryTime = Date.now() + (expiryMinutes * 60 * 1000);
      const item = { data, expiry: expiryTime };
      localStorage.setItem(key, JSON.stringify(item));
    }
  },

  // Get data if not expired
  get(key: string) {
    if (typeof window !== 'undefined') {
      const item = localStorage.getItem(key);
      if (!item) return null;

      try {
        const parsed = JSON.parse(item);
        if (Date.now() > parsed.expiry) {
          localStorage.removeItem(key);
          return null;
        }
        return parsed.data;
      } catch {
        localStorage.removeItem(key);
        return null;
      }
    }
    return null;
  },

  // Remove specific item
  remove(key: string) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    }
  },

  // Clear all cached data
  clearAll() {
    if (typeof window !== 'undefined') {
      Object.values(this.STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
    }
  },
} as const;
