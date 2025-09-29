import { Context, Next } from 'hono';

interface CacheEntry {
  data: any;
  timestamp: number;
  etag: string;
}

class SimpleCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  generateETag(data: any): string {
    // Simple ETag generation based on content hash
    const content = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `"${Math.abs(hash).toString(36)}"`;
  }

  get(key: string, maxAge: number): CacheEntry | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > maxAge;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry;
  }

  set(key: string, data: any): void {
    // Simple LRU eviction when cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    const etag = this.generateETag(data);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      etag
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Global cache instance
const cache = new SimpleCache(200); // Store up to 200 entries

/**
 * Cache middleware for GET requests
 * @param maxAge Cache duration in milliseconds (default: 5 minutes)
 */
export function cacheMiddleware(maxAge: number = 5 * 60 * 1000) {
  return async (c: Context, next: Next) => {
    // Only cache GET requests
    if (c.req.method !== 'GET') {
      return next();
    }

    // Generate cache key based on URL and query params
    const url = new URL(c.req.url);
    const cacheKey = `${url.pathname}${url.search}`;

    // Check for cached response
    const cachedEntry = cache.get(cacheKey, maxAge);
    if (cachedEntry) {
      // Check if client has cached version (ETag)
      const clientETag = c.req.header('If-None-Match');
      if (clientETag === cachedEntry.etag) {
        c.header('ETag', cachedEntry.etag);
        return c.body(null, 304); // Not Modified
      }

      // Return cached response with cache headers
      c.header('ETag', cachedEntry.etag);
      c.header('X-Cache', 'HIT');
      c.header('Cache-Control', `public, max-age=${Math.floor(maxAge / 1000)}`);
      
      return c.json(cachedEntry.data);
    }

    // Call the next middleware/controller
    await next();

    // Try to cache the response if it was successful
    if (c.res.status >= 200 && c.res.status < 300) {
      try {
        // Extract the response data
        const responseText = await c.res.clone().text();
        const responseData = JSON.parse(responseText);
        
        // Store in cache
        cache.set(cacheKey, responseData);
        
        // Add cache headers
        const freshEntry = cache.get(cacheKey, maxAge);
        if (freshEntry) {
          c.header('ETag', freshEntry.etag);
          c.header('X-Cache', 'MISS');
          c.header('Cache-Control', `public, max-age=${Math.floor(maxAge / 1000)}`);
        }
      } catch (error) {
        // Silently fail if we can't cache
        console.warn('Cache middleware: Unable to cache response:', error instanceof Error ? error.message : 'Unknown error');
      }
    }
  };
}

/**
 * Clear cache entries matching a pattern
 */
export function clearCache(pattern?: string): void {
  if (!pattern) {
    cache.clear();
    return;
  }

  // Clear entries matching pattern
  for (const key of cache['cache'].keys()) {
    if (key.includes(pattern)) {
      cache['cache'].delete(key);
    }
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    size: cache.size(),
    maxSize: cache['maxSize']
  };
}