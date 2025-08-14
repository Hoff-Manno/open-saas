// System Monitoring and Health Checks
import { type Context } from 'wasp/server/operations';

// Health check status
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
}

// Health check result
export interface HealthCheckResult {
  service: string;
  status: HealthStatus;
  responseTime: number;
  message?: string;
  details?: any;
  timestamp: string;
}

// System metrics
export interface SystemMetrics {
  timestamp: string;
  database: {
    connectionCount: number;
    queryTime: number;
    errorRate: number;
  };
  processing: {
    queueSize: number;
    processingRate: number;
    failureRate: number;
    avgProcessingTime: number;
  };
  storage: {
    totalFiles: number;
    totalSize: number;
    uploadRate: number;
    errorRate: number;
  };
  users: {
    activeUsers: number;
    totalUsers: number;
    subscriptionDistribution: Record<string, number>;
  };
}

// Alert levels
export enum AlertLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

// Alert interface
export interface Alert {
  id: string;
  level: AlertLevel;
  service: string;
  message: string;
  details?: any;
  timestamp: string;
  resolved?: boolean;
  resolvedAt?: string;
}

// Health check functions
export class HealthChecker {
  private static instance: HealthChecker;
  private alerts: Alert[] = [];
  private metrics: SystemMetrics[] = [];

  static getInstance(): HealthChecker {
    if (!HealthChecker.instance) {
      HealthChecker.instance = new HealthChecker();
    }
    return HealthChecker.instance;
  }

  // Database health check
  async checkDatabase(context: Context): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Simple query to check database connectivity
      await context.entities.User.count();
      
      const responseTime = Date.now() - startTime;
      
      return {
        service: 'database',
        status: responseTime < 1000 ? HealthStatus.HEALTHY : HealthStatus.DEGRADED,
        responseTime,
        message: responseTime < 1000 ? 'Database is responsive' : 'Database response is slow',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        service: 'database',
        status: HealthStatus.UNHEALTHY,
        responseTime: Date.now() - startTime,
        message: 'Database connection failed',
        details: { error: String(error) },
        timestamp: new Date().toISOString(),
      };
    }
  }

  // PDF processing service health check
  async checkPDFProcessing(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Check if Docling service is available
      // This would typically involve a health endpoint or simple test
      const { spawn } = require('child_process');
      
      return new Promise((resolve) => {
        const process = spawn('python', ['-c', 'import docling; print("OK")'], {
          timeout: 5000,
        });
        
        let output = '';
        process.stdout.on('data', (data: Buffer) => {
          output += data.toString();
        });
        
        process.on('close', (code: number) => {
          const responseTime = Date.now() - startTime;
          
          if (code === 0 && output.includes('OK')) {
            resolve({
              service: 'pdf_processing',
              status: HealthStatus.HEALTHY,
              responseTime,
              message: 'PDF processing service is available',
              timestamp: new Date().toISOString(),
            });
          } else {
            resolve({
              service: 'pdf_processing',
              status: HealthStatus.UNHEALTHY,
              responseTime,
              message: 'PDF processing service is unavailable',
              details: { code, output },
              timestamp: new Date().toISOString(),
            });
          }
        });
        
        process.on('error', (error: Error) => {
          resolve({
            service: 'pdf_processing',
            status: HealthStatus.UNHEALTHY,
            responseTime: Date.now() - startTime,
            message: 'PDF processing service error',
            details: { error: error.message },
            timestamp: new Date().toISOString(),
          });
        });
      });
    } catch (error) {
      return {
        service: 'pdf_processing',
        status: HealthStatus.UNHEALTHY,
        responseTime: Date.now() - startTime,
        message: 'PDF processing service check failed',
        details: { error: String(error) },
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Storage health check
  async checkStorage(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Check S3 connectivity by listing buckets or a simple operation
      // This is a placeholder - implement actual S3 health check
      const AWS = require('aws-sdk');
      const s3 = new AWS.S3();
      
      await s3.headBucket({ Bucket: process.env.AWS_S3_FILES_BUCKET }).promise();
      
      const responseTime = Date.now() - startTime;
      
      return {
        service: 'storage',
        status: responseTime < 2000 ? HealthStatus.HEALTHY : HealthStatus.DEGRADED,
        responseTime,
        message: 'Storage service is accessible',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        service: 'storage',
        status: HealthStatus.UNHEALTHY,
        responseTime: Date.now() - startTime,
        message: 'Storage service is inaccessible',
        details: { error: String(error) },
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Queue health check
  async checkQueue(context: Context): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Check PgBoss queue status
      // This would involve checking queue size, failed jobs, etc.
      const queueStats = await this.getQueueStats(context);
      
      const responseTime = Date.now() - startTime;
      let status = HealthStatus.HEALTHY;
      let message = 'Queue is operating normally';
      
      if (queueStats.failedJobs > 10) {
        status = HealthStatus.DEGRADED;
        message = 'Queue has multiple failed jobs';
      }
      
      if (queueStats.pendingJobs > 100) {
        status = HealthStatus.DEGRADED;
        message = 'Queue has high backlog';
      }
      
      return {
        service: 'queue',
        status,
        responseTime,
        message,
        details: queueStats,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        service: 'queue',
        status: HealthStatus.UNHEALTHY,
        responseTime: Date.now() - startTime,
        message: 'Queue health check failed',
        details: { error: String(error) },
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Get queue statistics
  private async getQueueStats(context: Context): Promise<{
    pendingJobs: number;
    failedJobs: number;
    completedJobs: number;
  }> {
    // This is a placeholder - implement actual queue stats
    // In a real implementation, you'd query PgBoss tables
    return {
      pendingJobs: 0,
      failedJobs: 0,
      completedJobs: 0,
    };
  }

  // Comprehensive health check
  async performHealthCheck(context: Context): Promise<{
    overall: HealthStatus;
    services: HealthCheckResult[];
    timestamp: string;
  }> {
    const services = await Promise.all([
      this.checkDatabase(context),
      this.checkPDFProcessing(),
      this.checkStorage(),
      this.checkQueue(context),
    ]);

    // Determine overall health
    let overall = HealthStatus.HEALTHY;
    
    if (services.some(s => s.status === HealthStatus.UNHEALTHY)) {
      overall = HealthStatus.UNHEALTHY;
    } else if (services.some(s => s.status === HealthStatus.DEGRADED)) {
      overall = HealthStatus.DEGRADED;
    }

    return {
      overall,
      services,
      timestamp: new Date().toISOString(),
    };
  }

  // Collect system metrics
  async collectMetrics(context: Context): Promise<SystemMetrics> {
    try {
      const [
        userStats,
        moduleStats,
        processingStats,
        storageStats,
      ] = await Promise.all([
        this.getUserStats(context),
        this.getModuleStats(context),
        this.getProcessingStats(context),
        this.getStorageStats(context),
      ]);

      const metrics: SystemMetrics = {
        timestamp: new Date().toISOString(),
        database: {
          connectionCount: 1, // Placeholder
          queryTime: 50, // Placeholder
          errorRate: 0, // Placeholder
        },
        processing: processingStats,
        storage: storageStats,
        users: userStats,
      };

      // Store metrics for historical analysis
      this.metrics.push(metrics);
      
      // Keep only last 100 metrics entries
      if (this.metrics.length > 100) {
        this.metrics = this.metrics.slice(-100);
      }

      return metrics;
    } catch (error) {
      console.error('Error collecting metrics:', error);
      throw error;
    }
  }

  private async getUserStats(context: Context) {
    const totalUsers = await context.entities.User.count();
    const activeUsers = await context.entities.User.count({
      where: {
        progress: {
          some: {
            lastAccessed: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
        },
      },
    });

    const subscriptionDistribution = await context.entities.User.groupBy({
      by: ['subscriptionPlan'],
      _count: true,
    });

    return {
      activeUsers,
      totalUsers,
      subscriptionDistribution: subscriptionDistribution.reduce((acc, item) => {
        acc[item.subscriptionPlan || 'free'] = item._count;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  private async getModuleStats(context: Context) {
    // Placeholder implementation
    return {
      queueSize: 0,
      processingRate: 0,
      failureRate: 0,
      avgProcessingTime: 0,
    };
  }

  private async getProcessingStats(context: Context) {
    const totalModules = await context.entities.LearningModule.count();
    const processingModules = await context.entities.LearningModule.count({
      where: { processingStatus: 'PROCESSING' },
    });
    const failedModules = await context.entities.LearningModule.count({
      where: { processingStatus: 'FAILED' },
    });

    return {
      queueSize: processingModules,
      processingRate: 0, // Calculate based on completed modules in last hour
      failureRate: totalModules > 0 ? failedModules / totalModules : 0,
      avgProcessingTime: 0, // Calculate based on processing times
    };
  }

  private async getStorageStats(context: Context) {
    const totalFiles = await context.entities.File.count();
    
    return {
      totalFiles,
      totalSize: 0, // Would need to calculate from file sizes
      uploadRate: 0, // Files uploaded in last hour
      errorRate: 0, // Upload error rate
    };
  }

  // Alert management
  createAlert(level: AlertLevel, service: string, message: string, details?: any): Alert {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      level,
      service,
      message,
      details,
      timestamp: new Date().toISOString(),
    };

    this.alerts.push(alert);
    
    // Keep only last 1000 alerts
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000);
    }

    // Log critical alerts
    if (level === AlertLevel.CRITICAL || level === AlertLevel.ERROR) {
      console.error(`[${level.toUpperCase()}] ${service}: ${message}`, details);
    }

    return alert;
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  getActiveAlerts(): Alert[] {
    return this.alerts.filter(a => !a.resolved);
  }

  getAlertHistory(limit: number = 100): Alert[] {
    return this.alerts.slice(-limit);
  }

  // Automated monitoring
  startMonitoring(context: Context, intervalMs: number = 60000): void {
    setInterval(async () => {
      try {
        const healthCheck = await this.performHealthCheck(context);
        
        // Create alerts for unhealthy services
        healthCheck.services.forEach(service => {
          if (service.status === HealthStatus.UNHEALTHY) {
            this.createAlert(
              AlertLevel.ERROR,
              service.service,
              service.message || 'Service is unhealthy',
              service.details
            );
          } else if (service.status === HealthStatus.DEGRADED) {
            this.createAlert(
              AlertLevel.WARNING,
              service.service,
              service.message || 'Service is degraded',
              service.details
            );
          }
        });

        // Collect metrics
        await this.collectMetrics(context);
      } catch (error) {
        console.error('Error in monitoring cycle:', error);
        this.createAlert(
          AlertLevel.ERROR,
          'monitoring',
          'Monitoring cycle failed',
          { error: String(error) }
        );
      }
    }, intervalMs);
  }
}

// Export singleton instance
export const healthChecker = HealthChecker.getInstance();