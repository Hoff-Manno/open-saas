import { type DailyStats } from 'wasp/entities';
import { HttpError, prisma } from 'wasp/server';

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
 * Get comprehensive learning analytics
 */
export const getLearningAnalytics = async (args: LearningAnalyticsArgs, context: any): Promise<LearningMetrics> => {
  if (!context.user) {
    throw new HttpError(401, 'User must be authenticated');
  }

  if (!context.user.isAdmin && context.user.role !== 'ADMIN') {
    throw new HttpError(403, 'Only admins can access learning analytics');
  }

  const { days = 30, organizationId } = args;
  const since = new Date();
  since.setDate(since.getDate() - days);

  try {
    // Build where clause for organization filtering
    const orgFilter = organizationId 
      ? { organizationId } 
      : context.user.organizationId 
        ? { organizationId: context.user.organizationId }
        : {};

    // Total and active modules
    const [totalModules, activeModules] = await Promise.all([
      prisma.learningModule.count({
        where: orgFilter,
      }),
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
    ]);

    // Total and active learners
    const [totalLearners, activeLearners] = await Promise.all([
      prisma.user.count({
        where: {
          ...orgFilter,
          progress: {
            some: {},
          },
        },
      }),
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
    ]);

    // Completion rate calculation
    const [totalAssignments, completedAssignments] = await Promise.all([
      prisma.moduleAssignment.count({
        where: {
          module: orgFilter,
        },
      }),
      prisma.moduleAssignment.count({
        where: {
          module: orgFilter,
          completedAt: { not: null },
        },
      }),
    ]);

    const completionRate = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0;

    // Average time spent
    const timeSpentResult = await prisma.userProgress.aggregate({
      where: {
        module: orgFilter,
        lastAccessed: { gte: since },
      },
      _sum: { timeSpent: true },
    });

    const avgTimeSpent = totalLearners > 0 ? (timeSpentResult._sum.timeSpent || 0) / totalLearners : 0;

    // Top performing modules
    const topModules = await prisma.learningModule.findMany({
      where: orgFilter,
      select: {
        id: true,
        title: true,
        assignments: {
          where: { completedAt: { not: null } },
          select: { id: true },
        },
        progress: {
          select: {
            timeSpent: true,
          },
        },
      },
      take: 10,
    });

    const topModulesFormatted = topModules
      .map((module: any) => ({
        id: module.id,
        title: module.title,
        completions: module.assignments.length,
        totalTimeSpent: module.progress.reduce((sum: number, p: any) => sum + p.timeSpent, 0),
      }))
      .sort((a: any, b: any) => b.completions - a.completions);

    // Engagement trends (daily data for the specified period)
    const engagementTrends = await getEngagementTrends(days, orgFilter);

    return {
      totalModules,
      activeModules,
      totalLearners,
      activeLearners,
      completionRate: Math.round(completionRate * 100) / 100,
      avgTimeSpent: Math.round(avgTimeSpent * 100) / 100,
      topModules: topModulesFormatted,
      engagementTrends,
    };
  } catch (error) {
    console.error('Error getting learning analytics:', error);
    throw new HttpError(500, 'Failed to get learning analytics');
  }
};

/**
 * Get user engagement data for admin dashboard
 */
export const getUserEngagement = async (args: UserEngagementArgs, context: any): Promise<UserEngagementData[]> => {
  if (!context.user) {
    throw new HttpError(401, 'User must be authenticated');
  }

  if (!context.user.isAdmin && context.user.role !== 'ADMIN') {
    throw new HttpError(403, 'Only admins can access user engagement data');
  }

  const { userId, days = 30 } = args;
  const since = new Date();
  since.setDate(since.getDate() - days);

  try {
    const whereClause: any = {
      organizationId: context.user.organizationId,
      progress: { some: {} }, // Only users with learning activity
    };

    if (userId) {
      whereClause.id = userId;
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        username: true,
        assignedModules: {
          select: {
            id: true,
            completedAt: true,
            module: {
              select: {
                id: true,
                title: true,
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
            completed: true,
            lastAccessed: true,
            module: {
              select: {
                title: true,
              },
            },
            section: {
              select: {
                title: true,
              },
            },
          },
          orderBy: {
            lastAccessed: 'desc',
          },
        },
      },
      take: userId ? 1 : 50, // Limit to 50 users for performance
    });

    return users.map((user: any) => {
      const completedModules = user.assignedModules.filter((a: any) => a.completedAt).length;
      const inProgressModules = user.assignedModules.length - completedModules;
      const totalTimeSpent = user.progress.reduce((sum: number, p: any) => sum + p.timeSpent, 0);
      const lastActive = user.progress.length > 0 ? user.progress[0].lastAccessed : null;
      const completionRate = user.assignedModules.length > 0 
        ? (completedModules / user.assignedModules.length) * 100 
        : 0;

      return {
        userId: user.id,
        userName: user.username || user.email || 'Unknown User',
        totalModules: user.assignedModules.length,
        completedModules,
        inProgressModules,
        totalTimeSpent,
        lastActive,
        completionRate: Math.round(completionRate * 100) / 100,
        recentActivity: user.progress.slice(0, 10).map((p: any) => ({
          moduleTitle: p.module.title,
          sectionTitle: p.section.title,
          timeSpent: p.timeSpent,
          completed: p.completed,
          date: p.lastAccessed,
        })),
      };
    });
  } catch (error) {
    console.error('Error getting user engagement:', error);
    throw new HttpError(500, 'Failed to get user engagement data');
  }
};

/**
 * Helper function to get engagement trends
 */
async function getEngagementTrends(days: number, orgFilter: any) {
  const trends: Array<{ date: string; activeUsers: number; timeSpent: number; completions: number }> = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const [activeUsers, timeSpentResult, completions] = await Promise.all([
      prisma.user.count({
        where: {
          ...orgFilter,
          progress: {
            some: {
              lastAccessed: {
                gte: date,
                lt: nextDate,
              },
            },
          },
        },
      }),
      prisma.userProgress.aggregate({
        where: {
          module: orgFilter,
          lastAccessed: {
            gte: date,
            lt: nextDate,
          },
        },
        _sum: { timeSpent: true },
      }),
      prisma.moduleAssignment.count({
        where: {
          module: orgFilter,
          completedAt: {
            gte: date,
            lt: nextDate,
          },
        },
      }),
    ]);

    trends.push({
      date: date.toISOString().split('T')[0], // YYYY-MM-DD format
      activeUsers,
      timeSpent: timeSpentResult._sum.timeSpent || 0,
      completions,
    });
  }

  return trends;
}
