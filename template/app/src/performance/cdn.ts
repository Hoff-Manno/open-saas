// CDN and S3 optimization utilities
import { getDownloadFileSignedURLFromS3, downloadFileFromS3 } from '../file-upload/s3Utils';
import { cache, CacheKeys } from './caching';

// CDN-optimized content delivery
export class CDNOptimizer {
  private static readonly CDN_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly PROCESSED_CONTENT_PREFIX = 'processed-content/';
  
  /**
   * Get optimized URL for processed content with CDN caching
   */
  static async getProcessedContentURL(fileKey: string, moduleId: string): Promise<string> {
    const cacheKey = CacheKeys.PROCESSED_CONTENT(fileKey);
    
    // Check cache first
    const cachedURL = cache.get<string>(cacheKey);
    if (cachedURL) {
      return cachedURL;
    }

    // Generate new signed URL with longer expiry for processed content
    const processedKey = this.getProcessedContentKey(fileKey, moduleId);
    const signedURL = await getDownloadFileSignedURLFromS3({ key: processedKey });
    
    // Cache the URL for shorter time than its expiry
    cache.set(cacheKey, signedURL, this.CDN_CACHE_TTL);
    
    return signedURL;
  }

  /**
   * Store processed content in optimized S3 structure
   */
  static getProcessedContentKey(originalKey: string, moduleId: string): string {
    // Organize processed content by module for better CDN caching
    const fileName = originalKey.split('/').pop() || 'content';
    return `${this.PROCESSED_CONTENT_PREFIX}${moduleId}/${fileName}`;
  }

  /**
   * Prefetch content for better user experience
   */
  static async prefetchModuleContent(moduleId: string, sections: Array<{ id: string; content: string }>): Promise<void> {
    // Cache module sections content for instant access
    const cacheKey = CacheKeys.MODULE_SECTIONS(moduleId);
    const sectionsData = sections.map(section => ({
      id: section.id,
      content: section.content,
      // Extract images and other assets for prefetching
      assets: this.extractContentAssets(section.content),
    }));
    
    cache.set(cacheKey, sectionsData, this.CDN_CACHE_TTL);
  }

  /**
   * Extract assets (images, videos) from markdown content
   */
  private static extractContentAssets(markdownContent: string): string[] {
    const assets: string[] = [];
    
    // Extract image URLs
    const imageMatches = markdownContent.match(/!\[.*?\]\((.*?)\)/g) || [];
    imageMatches.forEach(match => {
      const urlMatch = match.match(/\((.*?)\)/);
      if (urlMatch && urlMatch[1]) {
        assets.push(urlMatch[1]);
      }
    });

    // Extract video URLs if any
    const videoMatches = markdownContent.match(/<video.*?src=["'](.*?)["']/g) || [];
    videoMatches.forEach(match => {
      const urlMatch = match.match(/src=["'](.*?)["']/);
      if (urlMatch && urlMatch[1]) {
        assets.push(urlMatch[1]);
      }
    });

    return assets;
  }

  /**
   * Optimize S3 keys for better performance and organization
   */
  static generateOptimizedS3Key(userId: string, fileName: string, contentType: 'pdf' | 'processed' | 'thumbnail'): string {
    const timestamp = Date.now();
    const fileExt = fileName.split('.').pop() || '';
    
    switch (contentType) {
      case 'pdf':
        return `pdfs/${userId}/${timestamp}/${fileName}`;
      case 'processed':
        return `processed/${userId}/${timestamp}/content.json`;
      case 'thumbnail':
        return `thumbnails/${userId}/${timestamp}/thumb.jpg`;
      default:
        return `misc/${userId}/${timestamp}/${fileName}`;
    }
  }

  /**
   * Batch download optimization for multiple files
   */
  static async batchDownload(keys: string[]): Promise<Map<string, Buffer | null>> {
    const results = new Map<string, Buffer | null>();
    
    // Process in batches to avoid overwhelming S3
    const batchSize = 5;
    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);
      const promises = batch.map(async (key) => {
        try {
          const buffer = await downloadFileFromS3(key);
          return { key, buffer };
        } catch (error) {
          console.error(`Failed to download ${key}:`, error);
          return { key, buffer: null };
        }
      });
      
      const batchResults = await Promise.all(promises);
      batchResults.forEach(({ key, buffer }) => {
        results.set(key, buffer);
      });
    }
    
    return results;
  }
}

// CDN configuration for different environments
export const CDNConfig = {
  // CloudFront distribution settings (if using AWS CloudFront)
  CLOUDFRONT_DOMAIN: process.env.CLOUDFRONT_DOMAIN || '',
  
  // Cache headers for different content types
  CACHE_HEADERS: {
    PDF_CONTENT: {
      'Cache-Control': 'public, max-age=86400', // 24 hours
      'ETag': true,
    },
    PROCESSED_CONTENT: {
      'Cache-Control': 'public, max-age=604800', // 7 days
      'ETag': true,
    },
    THUMBNAILS: {
      'Cache-Control': 'public, max-age=2592000', // 30 days
      'ETag': true,
    },
  },

  // Content compression settings
  COMPRESSION: {
    GZIP_TYPES: ['application/json', 'text/markdown', 'text/plain'],
    COMPRESSION_LEVEL: 6,
  },
} as const;

// Content delivery optimization utilities
export const ContentDelivery = {
  /**
   * Get optimized content URL based on user location and device
   */
  getOptimizedURL(baseURL: string, options?: {
    quality?: 'low' | 'medium' | 'high';
    format?: 'webp' | 'jpg' | 'png';
    resize?: { width?: number; height?: number };
  }): string {
    if (!options) return baseURL;

    const params = new URLSearchParams();
    
    if (options.quality) {
      const qualityMap = { low: '60', medium: '80', high: '95' };
      params.append('q', qualityMap[options.quality]);
    }
    
    if (options.format) {
      params.append('f', options.format);
    }
    
    if (options.resize) {
      if (options.resize.width) params.append('w', options.resize.width.toString());
      if (options.resize.height) params.append('h', options.resize.height.toString());
    }

    return params.toString() ? `${baseURL}?${params.toString()}` : baseURL;
  },

  /**
   * Preload critical resources
   */
  preloadResources(urls: string[]): void {
    if (typeof window === 'undefined') return;

    urls.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = url;
      link.as = 'fetch';
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  },

  /**
   * Lazy load non-critical content
   */
  lazyLoad(element: HTMLElement, callback: () => void): void {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      callback();
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          callback();
          observer.unobserve(element);
        }
      });
    }, { threshold: 0.1 });

    observer.observe(element);
  },
} as const;
