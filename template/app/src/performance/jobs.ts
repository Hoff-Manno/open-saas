// Job queue optimization for PDF processing and analytics
import { type ProcessPDFJob, type DailyStatsJob } from 'wasp/server/jobs';

// Job priority levels
export enum JobPriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  CRITICAL = 4,
}

// Job queue configuration optimizations
export const JobConfig = {
  // PgBoss configuration for optimal performance
  PGBOSS_CONFIG: {
    // Connection settings
    connectionString: process.env.DATABASE_URL,
    
    // Performance tuning
    newJobCheckInterval: 1000, // Check for new jobs every second
    archiveCompletedAfterSeconds: 86400, // Archive after 24 hours
    deleteAfterDays: 7, // Delete old jobs after 7 days
    
    // Job processing
    noSupervisor: false, // Enable supervisor for monitoring
    
    // Retry configuration
    retryLimit: 3,
    retryDelay: 60, // 1 minute
    retryBackoff: true,
    
    // Monitoring
    monitorStateIntervalSeconds: 10,
    maintenanceIntervalSeconds: 120,
  },

  // PDF processing job configuration  
  PDF_PROCESSING: {
    concurrency: 3, // Process up to 3 PDFs concurrently
    batchSize: 1, // Process one at a time for memory management
    retryLimit: 3,
    retryDelay: 300, // 5 minutes for PDF processing
    expireInSeconds: 3600, // 1 hour timeout
    priority: JobPriority.HIGH,
  },

  // Analytics job configuration
  ANALYTICS: {
    concurrency: 1, // Single analytics job at a time
    retryLimit: 2,
    retryDelay: 600, // 10 minutes
    expireInSeconds: 1800, // 30 minutes timeout
    priority: JobPriority.NORMAL,
  },

  // Background cleanup jobs
  CLEANUP: {
    concurrency: 1,
    retryLimit: 1,
    expireInSeconds: 3600, // 1 hour
    priority: JobPriority.LOW,
  },
} as const;

// Enhanced job queue manager
export class JobQueueOptimizer {
  
  /**
   * Schedule PDF processing with optimized priority and batching
   */
  static async schedulePDFProcessing(
    jobData: { moduleId: string; filePath: string; userId: string },
    options?: {
      priority?: JobPriority;
      delay?: number;
      retryLimit?: number;
    }
  ) {
    const jobOptions = {
      priority: options?.priority || JobConfig.PDF_PROCESSING.priority,
      retryLimit: options?.retryLimit || JobConfig.PDF_PROCESSING.retryLimit,
      retryDelay: JobConfig.PDF_PROCESSING.retryDelay,
      expireInSeconds: JobConfig.PDF_PROCESSING.expireInSeconds,
      startAfter: options?.delay ? new Date(Date.now() + options.delay) : undefined,
    };

    // Add job metadata for monitoring
    const enhancedJobData = {
      ...jobData,
      scheduledAt: new Date().toISOString(),
      estimatedDuration: this.estimatePDFProcessingTime(jobData.filePath),
    };

    return enhancedJobData;
  }

  /**
   * Batch process multiple PDF jobs for efficiency
   */
  static async batchSchedulePDFJobs(
    jobs: Array<{ moduleId: string; filePath: string; userId: string }>,
    batchSize = 3
  ) {
    const batches: typeof jobs[] = [];
    for (let i = 0; i < jobs.length; i += batchSize) {
      batches.push(jobs.slice(i, i + batchSize));
    }

    const results = [];
    for (const batch of batches) {
      const batchPromises = batch.map((job, index) => 
        this.schedulePDFProcessing(job, {
          delay: index * 30000, // Stagger jobs by 30 seconds
        })
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Estimate processing time based on file characteristics
   */
  private static estimatePDFProcessingTime(filePath: string): number {
    // Basic estimation - in production, could be based on file size, page count, etc.
    const baseTime = 60; // 1 minute base time
    const fileName = filePath.split('/').pop() || '';
    
    // Rough estimation based on filename (in production, use actual file metadata)
    if (fileName.includes('large') || fileName.includes('complex')) {
      return baseTime * 3; // 3 minutes for complex files
    }
    
    return baseTime;
  }

  /**
   * Optimize job queue performance monitoring
   */
  static async getJobQueueHealth() {
    // In a real implementation, this would connect to PgBoss and get stats
    return {
      activeJobs: 0, // Number of currently processing jobs
      queuedJobs: 0, // Number of jobs waiting to be processed  
      failedJobs: 0, // Number of failed jobs in last 24h
      completedJobs: 0, // Number of completed jobs in last 24h
      averageProcessingTime: 0, // Average time per job
      systemHealth: 'healthy' as 'healthy' | 'degraded' | 'critical',
    };
  }

  /**
   * Implement job queue cleanup and maintenance
   */
  static async performMaintenance() {
    console.log('Performing job queue maintenance...');
    
    // Archive old completed jobs
    // Delete failed jobs older than retention period
    // Clean up job artifacts
    // Update job statistics
    
    console.log('Job queue maintenance completed');
  }
}

// Job monitoring and alerts
export class JobMonitoring {
  private static readonly ALERT_THRESHOLDS = {
    MAX_QUEUE_SIZE: 100,
    MAX_FAILED_JOBS_HOUR: 10,
    MAX_PROCESSING_TIME_MINUTES: 30,
  };

  /**
   * Monitor job queue health and send alerts
   */
  static async monitorJobHealth() {
    const health = await JobQueueOptimizer.getJobQueueHealth();
    
    // Check queue size
    if (health.queuedJobs > this.ALERT_THRESHOLDS.MAX_QUEUE_SIZE) {
      await this.sendAlert('high_queue_size', {
        current: health.queuedJobs,
        threshold: this.ALERT_THRESHOLDS.MAX_QUEUE_SIZE,
      });
    }

    // Check failure rate
    if (health.failedJobs > this.ALERT_THRESHOLDS.MAX_FAILED_JOBS_HOUR) {
      await this.sendAlert('high_failure_rate', {
        current: health.failedJobs,
        threshold: this.ALERT_THRESHOLDS.MAX_FAILED_JOBS_HOUR,
      });
    }

    // Check processing time
    const avgTimeMinutes = health.averageProcessingTime / 60;
    if (avgTimeMinutes > this.ALERT_THRESHOLDS.MAX_PROCESSING_TIME_MINUTES) {
      await this.sendAlert('slow_processing', {
        current: avgTimeMinutes,
        threshold: this.ALERT_THRESHOLDS.MAX_PROCESSING_TIME_MINUTES,
      });
    }

    return health;
  }

  /**
   * Send alert notification (integrate with existing notification system)
   */
  private static async sendAlert(type: string, data: any) {
    console.error(`Job Queue Alert: ${type}`, data);
    
    // In production, integrate with:
    // - Email notifications
    // - Slack/Teams alerts
    // - Monitoring services (DataDog, New Relic, etc.)
    // - Admin dashboard notifications
  }

  /**
   * Generate job performance metrics
   */
  static async generateJobMetrics(timeframe: 'hour' | 'day' | 'week' = 'day') {
    const metrics = {
      timeframe,
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      averageCompletionTime: 0,
      throughput: 0, // jobs per hour
      errorRate: 0, // percentage
      resourceUtilization: {
        cpu: 0,
        memory: 0,
        diskIO: 0,
      },
    };

    // Calculate error rate
    if (metrics.totalJobs > 0) {
      metrics.errorRate = (metrics.failedJobs / metrics.totalJobs) * 100;
    }

    return metrics;
  }
}

// Job retry strategies
export const JobRetryStrategies = {
  /**
   * Exponential backoff for transient failures
   */
  exponentialBackoff: (attempt: number, baseDelay = 60): number => {
    return Math.min(baseDelay * Math.pow(2, attempt - 1), 3600); // Max 1 hour
  },

  /**
   * Linear backoff for rate-limited operations
   */
  linearBackoff: (attempt: number, baseDelay = 300): number => {
    return baseDelay * attempt; // 5 min, 10 min, 15 min, etc.
  },

  /**
   * Fixed delay for consistent retry timing
   */
  fixedDelay: (baseDelay = 600): number => {
    return baseDelay; // Always 10 minutes
  },

  /**
   * Smart retry based on error type
   */
  smartRetry: (error: Error, attempt: number): number => {
    const errorMessage = error.message.toLowerCase();
    
    // Rate limiting errors - longer delays
    if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
      return JobRetryStrategies.exponentialBackoff(attempt, 300); // Start with 5 minutes
    }
    
    // Network errors - shorter delays
    if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
      return JobRetryStrategies.exponentialBackoff(attempt, 60); // Start with 1 minute
    }
    
    // File processing errors - medium delays
    if (errorMessage.includes('processing') || errorMessage.includes('conversion')) {
      return JobRetryStrategies.linearBackoff(attempt, 180); // 3 min intervals
    }
    
    // Default exponential backoff
    return JobRetryStrategies.exponentialBackoff(attempt);
  },
} as const;
