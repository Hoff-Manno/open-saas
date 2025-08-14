// Database query optimization utilities
import { prisma } from 'wasp/server';
import { cache, CacheKeys, withCache } from './caching';

// Optimized database queries following existing analytics patterns
export class DatabaseOptimizer {
  
  /**
   * Optimized user progress query with proper indexing and caching
   */
  static async getUserProgressOptimized(userId: string, moduleId?: string) {
    const cacheKey = CacheKeys.USER_PROGRESS(userId, moduleId);
    
    return withCache(cacheKey, async () => {
      const whereClause: any = { userId };
      if (moduleId) {
        whereClause.moduleId = moduleId;
      }

      // Use select to only fetch needed fields and include relations efficiently
      return prisma.userProgress.findMany({
        where: whereClause,
        select: {
          id: true,
          moduleId: true,
          sectionId: true,
          completed: true,
          timeSpent: true,
          lastAccessed: true,
          bookmarkPosition: true,
          module: {
            select: {
              id: true,
              title: true,
            },
          },
          section: {
            select: {
              id: true,
              title: true,
              orderIndex: true,
            },
          },
        },
        orderBy: [
          { module: { title: 'asc' } },
          { section: { orderIndex: 'asc' } },
        ],
      });
    }, 5 * 60 * 1000); // 5 minutes cache
  }

  /**
   * Batch fetch module data with optimized queries
   */
  static async getModuleBatchOptimized(moduleIds: string[]) {
    if (moduleIds.length === 0) return [];

    // Check cache for individual modules first
    const cached: any[] = [];
    const uncachedIds: string[] = [];

    moduleIds.forEach(id => {
      const cacheKey = CacheKeys.MODULE_CONTENT(id);
      const cachedModule = cache.get(cacheKey);
      if (cachedModule) {
        cached.push(cachedModule);
      } else {
        uncachedIds.push(id);
      }
    });

    if (uncachedIds.length === 0) {
      return cached;
    }

    // Fetch uncached modules with optimized query
    const freshModules = await prisma.learningModule.findMany({
      where: {
        id: { in: uncachedIds },
      },
      select: {
        id: true,
        title: true,
        description: true,
        originalFileName: true,
        processingStatus: true,
        createdAt: true,
        updatedAt: true,
        creatorId: true,
        organizationId: true,
        // Only include sections count, not full content for performance
        _count: {
          select: {
            sections: true,
          },
        },
        sections: {
          select: {
            id: true,
            title: true,
            orderIndex: true,
            estimatedMinutes: true,
          },
          orderBy: {
            orderIndex: 'asc',
          },
        },
      },
    });

    // Cache individual modules
    freshModules.forEach(module => {
      const cacheKey = CacheKeys.MODULE_CONTENT(module.id);
      cache.set(cacheKey, module, 10 * 60 * 1000); // 10 minutes
    });

    return [...cached, ...freshModules];
  }

  /**
   * Optimized learning analytics query with aggregations
   */
  static async getLearningAnalyticsOptimized(organizationId?: string, days = 30) {
    const cacheKey = CacheKeys.LEARNING_ANALYTICS(organizationId, days);
    
    return withCache(cacheKey, async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const orgFilter = organizationId ? { organizationId } : {};

      // Use parallel queries with proper aggregations
      const [
        totalModules,
        activeModules,
        totalLearners,
        activeLearners,
        completionStats,
        timeStats,
        topModules,
      ] = await Promise.all([
        // Total modules count
        prisma.learningModule.count({ where: orgFilter }),
        
        // Active modules (with recent progress)
        prisma.learningModule.count({
          where: {
            ...orgFilter,
            progress: {
              some: {
                lastAccessed: { gte: since },
              },
            },
          },
        }),
        
        // Total learners
        prisma.user.count({
          where: {
            ...orgFilter,
            assignedModules: {
              some: {},
            },
          },
        }),
        
        // Active learners
        prisma.user.count({
          where: {
            ...orgFilter,
            progress: {
              some: {
                lastAccessed: { gte: since },
              },
            },
          },
        }),
        
        // Completion statistics
        prisma.userProgress.aggregate({
          where: {
            lastAccessed: { gte: since },
            ...(organizationId && {
              user: { organizationId },
            }),
          },
          _avg: {
            timeSpent: true,
          },
          _count: {
            completed: true,
          },
          _sum: {
            timeSpent: true,
          },
        }),
        
        // Time spent statistics  
        prisma.userProgress.groupBy({
          by: ['userId'],
          where: {
            lastAccessed: { gte: since },
            ...(organizationId && {
              user: { organizationId },
            }),
          },
          _sum: {
            timeSpent: true,
          },
        }),
        
        // Top performing modules
        prisma.learningModule.findMany({
          where: orgFilter,
          select: {
            id: true,
            title: true,
            _count: {
              select: {
                progress: {
                  where: {
                    completed: true,
                    lastAccessed: { gte: since },
                  },
                },
              },
            },
            progress: {
              where: {
                lastAccessed: { gte: since },
              },
              select: {
                timeSpent: true,
              },
            },
          },
          orderBy: {
            progress: {
              _count: 'desc',
            },
          },
          take: 10,
        }),
      ]);

      // Process results
      const avgTimeSpent = completionStats._avg.timeSpent || 0;
      const totalTimeSpent = completionStats._sum.timeSpent || 0;
      const avgTimePerUser = timeStats.length > 0 ? 
        timeStats.reduce((sum, user) => sum + (user._sum.timeSpent || 0), 0) / timeStats.length : 0;

      const topModulesFormatted = topModules.map(module => ({
        id: module.id,
        title: module.title,
        completions: module._count.progress,
        totalTimeSpent: module.progress.reduce((sum, p) => sum + p.timeSpent, 0),
      }));

      return {
        totalModules,
        activeModules,
        totalLearners,
        activeLearners,
        completionRate: totalLearners > 0 ? (activeLearners / totalLearners) * 100 : 0,
        avgTimeSpent,
        totalTimeSpent,
        avgTimePerUser,
        topModules: topModulesFormatted,
      };
    }, 10 * 60 * 1000); // 10 minutes cache for analytics
  }

  /**
   * Optimized query for dashboard statistics
   */
  static async getDashboardStatsOptimized(organizationId?: string) {
    const cacheKey = CacheKeys.DASHBOARD_STATS(organizationId);
    
    return withCache(cacheKey, async () => {
      const orgFilter = organizationId ? { organizationId } : {};
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Parallel aggregation queries
      const [moduleStats, userStats, progressStats] = await Promise.all([
        // Module statistics
        prisma.learningModule.aggregate({
          where: orgFilter,
          _count: true,
        }),
        
        // User statistics
        prisma.user.aggregate({
          where: orgFilter,
          _count: true,
        }),
        
        // Progress statistics for today
        prisma.userProgress.aggregate({
          where: {
            lastAccessed: { gte: today },
            ...(organizationId && {
              user: { organizationId },
            }),
          },
          _count: {
            completed: true,
          },
          _sum: {
            timeSpent: true,
          },
        }),
      ]);

      return {
        totalModules: moduleStats._count,
        totalUsers: userStats._count,
        todayCompletions: progressStats._count.completed,
        todayTimeSpent: progressStats._sum.timeSpent || 0,
      };
    }, 5 * 60 * 1000); // 5 minutes cache
  }

  /**
   * Bulk update operations for better performance
   */
  static async bulkUpdateUserProgress(updates: Array<{
    userId: string;
    moduleId: string;
    sectionId: string;
    timeSpent?: number;
    completed?: boolean;
    bookmarkPosition?: string;
  }>) {
    if (updates.length === 0) return;

    // Use transaction for consistency
    await prisma.$transaction(async (tx) => {
      for (const update of updates) {
        await tx.userProgress.upsert({
          where: {
            userId_moduleId_sectionId: {
              userId: update.userId,
              moduleId: update.moduleId,
              sectionId: update.sectionId,
            },
          },
          update: {
            ...(update.timeSpent !== undefined && { timeSpent: { increment: update.timeSpent } }),
            ...(update.completed !== undefined && { completed: update.completed }),
            ...(update.bookmarkPosition !== undefined && { bookmarkPosition: update.bookmarkPosition }),
            lastAccessed: new Date(),
          },
          create: {
            userId: update.userId,
            moduleId: update.moduleId,
            sectionId: update.sectionId,
            timeSpent: update.timeSpent || 0,
            completed: update.completed || false,
            bookmarkPosition: update.bookmarkPosition,
            lastAccessed: new Date(),
          },
        });

        // Invalidate relevant caches
        cache.delete(CacheKeys.USER_PROGRESS(update.userId));
        cache.delete(CacheKeys.USER_PROGRESS(update.userId, update.moduleId));
      }
    });
  }

  /**
   * Connection pool optimization settings
   */
  static getOptimizedPrismaConfig() {
    return {
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      // Connection pool settings for production
      __internal: {
        engine: {
          connectionTimeout: 10000,
          poolTimeout: 10000,
          maxOpenConnections: 20,
          maxIdleConnections: 5,
        },
      },
    };
  }
}

// Database indexing recommendations
export const DatabaseIndexes = {
  // Recommended indexes for optimal performance
  RECOMMENDED_INDEXES: [
    // User progress queries
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_progress_user_module ON "UserProgress" ("userId", "moduleId");',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_progress_last_accessed ON "UserProgress" ("lastAccessed");',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_progress_completed ON "UserProgress" ("completed");',
    
    // Learning module queries  
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_learning_module_organization ON "LearningModule" ("organizationId");',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_learning_module_status ON "LearningModule" ("processingStatus");',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_learning_module_created ON "LearningModule" ("createdAt");',
    
    // Module sections
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_module_section_module_order ON "ModuleSection" ("moduleId", "orderIndex");',
    
    // Module assignments
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_module_assignment_user ON "ModuleAssignment" ("userId");',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_module_assignment_module ON "ModuleAssignment" ("moduleId");',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_module_assignment_due_date ON "ModuleAssignment" ("dueDate");',
    
    // Analytics queries
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_stats_date ON "DailyStats" ("date");',
    
    // User queries
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_organization ON "User" ("organizationId");',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_role ON "User" ("role");',
  ],

  // Query optimization tips
  OPTIMIZATION_TIPS: [
    'Use SELECT with specific fields instead of SELECT *',
    'Use proper WHERE clause indexing',
    'Implement pagination for large result sets',
    'Use aggregations at database level instead of application level',
    'Batch INSERT/UPDATE operations when possible',
    'Use connection pooling appropriately',
    'Monitor slow queries and add indexes accordingly',
  ],
} as const;
