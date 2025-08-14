import { type DailyStats } from 'wasp/entities';
import { HttpError, prisma } from 'wasp/server';
import { DatabaseOptimizer } from '../performance/database';
import { cache, CacheKeys, withCache } from '../performance/caching';

export type LearningAnalyticsArgs = {
  days?: number;
  organizationId?: string;
};

export type LearningMetrics = {
  totalModules: number;
  activeModules: number;
  totalLearners: number;
  activeLearners: number;
  completionRate: number;
  avgTimeSpent: number;
  topModules: Array<{
    id: string;
    title: string;
    completions: number;
    avgRating?: number;
    totalTimeSpent: number;
  }>;
  engagementTrends: Array<{
    date: string;
    activeUsers: number;
    timeSpent: number;
    completions: number;
  }>;
};

export type UserEngagementArgs = {
  userId?: string;
  days?: number;
};

export type UserEngagementData = {
  userId: string;
  userName: string;
  totalModules: number;
  completedModules: number;
  inProgressModules: number;
  totalTimeSpent: number;
  lastActive: Date | null;
  completionRate: number;
  recentActivity: Array<{
    moduleTitle: string;
    sectionTitle: string;
    timeSpent: number;
    completed: boolean;
    date: Date;
  }>;
};

/**
 * Get comprehensive learning analytics with performance optimizations
 */
export const getLearningAnalytics = async (args: LearningAnalyticsArgs, context: any): Promise<LearningMetrics> => {
  if (!context.user) {
    throw new HttpError(401, 'User must be authenticated');
  }

  if (!context.user.isAdmin && context.user.role !== 'ADMIN') {
    throw new HttpError(403, 'Only admins can access learning analytics');
  }

  const { days = 30, organizationId } = args;
  
  try {
    // Performance optimization: Use DatabaseOptimizer for complex analytics
    const optimizedResults = await DatabaseOptimizer.getLearningAnalyticsOptimized(organizationId, days);
    
    // Add engagement trends if not included
    const engagementTrends = await getEngagementTrends(organizationId, days);
    
    return {
      ...optimizedResults,
      engagementTrends,
    };
  } catch (error) {
    console.error('Error in getLearningAnalytics:', error);
    throw new HttpError(500, 'Failed to fetch learning analytics');
  }
};

/**
 * Get user engagement data with performance optimizations
 */
export const getUserEngagement = async (args: UserEngagementArgs, context: any): Promise<UserEngagementData[]> => {
  if (!context.user) {
    throw new HttpError(401, 'User must be authenticated');
  }

  if (!context.user.isAdmin && context.user.role !== 'ADMIN') {
    throw new HttpError(403, 'Only admins can access user engagement data');
  }

  const { userId, days = 7 } = args;
  const since = new Date();
  since.setDate(since.getDate() - days);

  try {
    // Use optimized database queries
    return await DatabaseOptimizer.getUserProgressOptimized(userId || '');
  } catch (error) {
    console.error('Error in getUserEngagement:', error);
    throw new HttpError(500, 'Failed to fetch user engagement data');
  }
};

/**
 * Get engagement trends for analytics dashboard
 */
async function getEngagementTrends(organizationId?: string, days = 30): Promise<LearningMetrics['engagementTrends']> {
  const cacheKey = `engagement_trends:${organizationId || 'all'}:${days}`;
  
  return withCache(cacheKey, async () => {
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Get daily engagement data
    const engagementData = await prisma.userProgress.groupBy({
      by: ['lastAccessed'],
      where: {
        lastAccessed: { gte: since },
        ...(organizationId && {
          user: { organizationId },
        }),
      },
      _count: {
        userId: true,
      },
      _sum: {
        timeSpent: true,
      },
      orderBy: {
        lastAccessed: 'asc',
      },
    });

    // Process data into daily trends
    const trends = engagementData.map(item => ({
      date: item.lastAccessed?.toISOString() || '',
      activeUsers: item._count.userId,
      timeSpent: item._sum.timeSpent || 0,
      completions: 0, // Could be calculated separately if needed
    }));

    return trends;
  }, 10 * 60 * 1000); // 10 minutes cache
}
