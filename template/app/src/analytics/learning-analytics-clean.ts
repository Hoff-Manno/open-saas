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
    
    // Add engagement trends
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
    const cacheKey = CacheKeys.USER_ENGAGEMENT(userId || 'all', days);
    
    return withCache(cacheKey, async () => {
      const whereClause = userId ? { id: userId } : {};
      
      const users = await prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          email: true,
          username: true,
          progress: {
            where: { lastAccessed: { gte: since } },
            include: {
              module: { select: { title: true } },
              section: { select: { title: true } },
            },
            orderBy: { lastAccessed: 'desc' },
          },
          assignedModules: {
            include: { module: true },
          },
        },
        take: userId ? 1 : 50, // Limit results when getting all users
      });

      return users.map(user => {
        const totalModules = user.assignedModules.length;
        const completedModules = user.assignedModules.filter(
          a => a.completedAt !== null
        ).length;
        const totalTimeSpent = user.progress.reduce(
          (sum, p) => sum + p.timeSpent, 0
        );

        return {
          userId: user.id,
          userName: user.username || user.email || 'Unknown',
          totalModules,
          completedModules,
          inProgressModules: totalModules - completedModules,
          totalTimeSpent,
          lastActive: user.progress[0]?.lastAccessed || null,
          completionRate: totalModules > 0 ? (completedModules / totalModules) * 100 : 0,
          recentActivity: user.progress.slice(0, 10).map(p => ({
            moduleTitle: p.module.title,
            sectionTitle: p.section.title,
            timeSpent: p.timeSpent,
            completed: p.completed,
            date: p.lastAccessed,
          })),
        };
      });
    }, 5 * 60 * 1000); // 5 minutes cache
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

    // Get daily engagement data with proper grouping
    const rawData = await prisma.userProgress.findMany({
      where: {
        lastAccessed: { gte: since },
        ...(organizationId && {
          user: { organizationId },
        }),
      },
      select: {
        lastAccessed: true,
        timeSpent: true,
        completed: true,
        userId: true,
      },
    });

    // Group by date and aggregate
    const dataByDate = new Map<string, { users: Set<string>; timeSpent: number; completions: number }>();
    
    rawData.forEach(item => {
      const dateKey = item.lastAccessed.toISOString().split('T')[0];
      
      if (!dataByDate.has(dateKey)) {
        dataByDate.set(dateKey, { users: new Set(), timeSpent: 0, completions: 0 });
      }
      
      const dayData = dataByDate.get(dateKey)!;
      dayData.users.add(item.userId);
      dayData.timeSpent += item.timeSpent;
      if (item.completed) {
        dayData.completions += 1;
      }
    });

    // Convert to trends format
    const trends = Array.from(dataByDate.entries()).map(([date, data]) => ({
      date,
      activeUsers: data.users.size,
      timeSpent: data.timeSpent,
      completions: data.completions,
    }));

    return trends.sort((a, b) => a.date.localeCompare(b.date));
  }, 10 * 60 * 1000); // 10 minutes cache
}
