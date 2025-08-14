import {
  type LearningModule,
  type ModuleSection,
  type UserProgress,
  type User,
} from 'wasp/entities'
import { HttpError } from 'wasp/server'

export type UpdateProgressArgs = {
  moduleId: string;
  sectionId: string;
  completed?: boolean;
  timeSpent?: number;
  bookmarkPosition?: string;
};

export type GetProgressArgs = {
  moduleId: string;
};

export type GetUserProgressSummaryArgs = {
  userId?: string;
};

/**
 * Update user progress for a specific section
 */
export const updateProgress = async (args: UpdateProgressArgs, context: any) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be authenticated');
  }

  const { moduleId, sectionId, completed, timeSpent, bookmarkPosition } = args;

  // Verify the section exists and belongs to the module
  const section = await context.entities.ModuleSection.findUnique({
    where: { id: sectionId },
    include: {
      module: {
        select: {
          id: true,
          organizationId: true,
        }
      }
    }
  });

  if (!section || section.module.id !== moduleId) {
    throw new HttpError(404, 'Section not found or does not belong to module');
  }

  // Check if user has access to this module (same organization)
  if (section.module.organizationId !== context.user.organizationId) {
    throw new HttpError(403, 'Access denied: Module not in your organization');
  }

  try {
    const existingProgress = await context.entities.UserProgress.findUnique({
      where: {
        userId_moduleId_sectionId: {
          userId: context.user.id,
          moduleId,
          sectionId
        }
      }
    });

    const updateData: any = {
      lastAccessed: new Date(),
    };

    if (completed !== undefined) {
      updateData.completed = completed;
    }

    if (timeSpent !== undefined && timeSpent > 0) {
      updateData.timeSpent = existingProgress 
        ? existingProgress.timeSpent + timeSpent 
        : timeSpent;
    }

    if (bookmarkPosition !== undefined) {
      updateData.bookmarkPosition = bookmarkPosition;
    }

    const progress = existingProgress
      ? await context.entities.UserProgress.update({
          where: {
            userId_moduleId_sectionId: {
              userId: context.user.id,
              moduleId,
              sectionId
            }
          },
          data: updateData,
          include: {
            section: {
              select: {
                id: true,
                title: true,
                orderIndex: true
              }
            }
          }
        })
      : await context.entities.UserProgress.create({
          data: {
            userId: context.user.id,
            moduleId,
            sectionId,
            ...updateData,
          },
          include: {
            section: {
              select: {
                id: true,
                title: true,
                orderIndex: true
              }
            }
          }
        });

    return progress;
  } catch (error) {
    console.error('Error updating progress:', error);
    throw new HttpError(500, 'Failed to update progress');
  }
};

/**
 * Get user progress for a specific module
 */
export const getModuleProgress = async (args: GetProgressArgs, context: any) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be authenticated');
  }

  const { moduleId } = args;

  try {
    // Verify user has access to this module
    const module = await context.entities.LearningModule.findUnique({
      where: { id: moduleId },
      select: {
        id: true,
        organizationId: true,
        title: true,
      }
    });

    if (!module) {
      throw new HttpError(404, 'Module not found');
    }

    if (module.organizationId !== context.user.organizationId) {
      throw new HttpError(403, 'Access denied: Module not in your organization');
    }

    // Get all sections for this module with user progress
    const sectionsWithProgress = await context.entities.ModuleSection.findMany({
      where: { moduleId },
      include: {
        progress: {
          where: { userId: context.user.id },
        }
      },
      orderBy: { orderIndex: 'asc' }
    });

    // Calculate overall progress
    const totalSections = sectionsWithProgress.length;
    const completedSections = sectionsWithProgress.filter(
      (section: any) => section.progress.length > 0 && section.progress[0].completed
    ).length;
    const totalTimeSpent = sectionsWithProgress.reduce(
      (total: number, section: any) => total + (section.progress[0]?.timeSpent || 0), 
      0
    );

    return {
      module: {
        id: module.id,
        title: module.title,
      },
      totalSections,
      completedSections,
      progressPercentage: totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0,
      totalTimeSpent,
      sections: sectionsWithProgress.map((section: any) => ({
        id: section.id,
        title: section.title,
        orderIndex: section.orderIndex,
        estimatedMinutes: section.estimatedMinutes,
        progress: section.progress[0] || null,
      }))
    };
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    console.error('Error getting module progress:', error);
    throw new HttpError(500, 'Failed to get module progress');
  }
};

/**
 * Get user's overall progress summary across all modules
 */
export const getUserProgressSummary = async (args: GetUserProgressSummaryArgs, context: any) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be authenticated');
  }

  const targetUserId = args.userId || context.user.id;

  // If requesting another user's progress, verify admin permissions
  if (targetUserId !== context.user.id && context.user.role !== 'ADMIN' && !context.user.isAdmin) {
    throw new HttpError(403, 'Cannot access other users progress data');
  }

  try {
    // Get all modules in user's organization with progress data
    const modules = await context.entities.LearningModule.findMany({
      where: {
        organizationId: context.user.organizationId,
        assignments: {
          some: { userId: targetUserId }
        }
      },
      include: {
        sections: {
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            title: true,
            estimatedMinutes: true,
          }
        },
        progress: {
          where: { userId: targetUserId },
          include: {
            section: {
              select: {
                id: true,
                title: true,
                orderIndex: true,
              }
            }
          }
        },
        assignments: {
          where: { userId: targetUserId },
          select: {
            assignedAt: true,
            dueDate: true,
            completedAt: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const progressSummary = modules.map((module: any) => {
      const totalSections = module.sections.length;
      const completedSections = module.progress.filter((p: any) => p.completed).length;
      const totalTimeSpent = module.progress.reduce((total: number, p: any) => total + p.timeSpent, 0);
      const estimatedTotalTime = module.sections.reduce((total: number, s: any) => total + (s.estimatedMinutes || 0), 0);
      const assignment = module.assignments[0];

      return {
        moduleId: module.id,
        title: module.title,
        description: module.description,
        totalSections,
        completedSections,
        progressPercentage: totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0,
        totalTimeSpent,
        estimatedTotalTime,
        isCompleted: completedSections === totalSections && totalSections > 0,
        assignment: assignment ? {
          assignedAt: assignment.assignedAt,
          dueDate: assignment.dueDate,
          completedAt: assignment.completedAt,
        } : null,
        lastAccessed: module.progress.length > 0 
          ? Math.max(...module.progress.map((p: any) => p.lastAccessed.getTime()))
          : null,
      };
    });

    return {
      totalModules: progressSummary.length,
      completedModules: progressSummary.filter((m: any) => m.isCompleted).length,
      totalTimeSpent: progressSummary.reduce((total: number, m: any) => total + m.totalTimeSpent, 0),
      modules: progressSummary,
    };
  } catch (error) {
    console.error('Error getting user progress summary:', error);
    throw new HttpError(500, 'Failed to get progress summary');
  }
};

/**
 * Get recent learning activity for dashboard
 */
export const getRecentLearningActivity = async (args: any, context: any) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be authenticated');
  }

  try {
    const recentProgress = await context.entities.UserProgress.findMany({
      where: { 
        userId: context.user.id,
        lastAccessed: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      include: {
        module: {
          select: {
            id: true,
            title: true,
          }
        },
        section: {
          select: {
            id: true,
            title: true,
          }
        }
      },
      orderBy: { lastAccessed: 'desc' },
      take: 10
    });

    return recentProgress.map((progress: any) => ({
      moduleId: progress.moduleId,
      moduleTitle: progress.module.title,
      sectionId: progress.sectionId,
      sectionTitle: progress.section.title,
      completed: progress.completed,
      timeSpent: progress.timeSpent,
      lastAccessed: progress.lastAccessed,
    }));
  } catch (error) {
    console.error('Error getting recent learning activity:', error);
    throw new HttpError(500, 'Failed to get recent learning activity');
  }
};

/**
 * Mark multiple sections as completed (bulk operation)
 */
export const bulkUpdateProgress = async (args: { updates: UpdateProgressArgs[] }, context: any) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be authenticated');
  }

  const { updates } = args;

  if (!updates || !Array.isArray(updates) || updates.length === 0) {
    throw new HttpError(400, 'Updates array is required');
  }

  try {
    const results: Array<{ success: boolean; data?: any; error?: string }> = [];
    
    // Process each update sequentially to maintain data integrity
    for (const update of updates) {
      try {
        const result = await updateProgress(update, context);
        results.push({ success: true, data: result });
      } catch (error) {
        console.error('Error in bulk update:', error);
        results.push({ success: false, error: (error as Error).message });
      }
    }

    return {
      total: updates.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  } catch (error) {
    console.error('Error in bulk update progress:', error);
    throw new HttpError(500, 'Failed to bulk update progress');
  }
};
