import {
  type LearningModule,
  type ModuleSection,
  type Organization,
  type User,
} from 'wasp/entities'
import { HttpError } from 'wasp/server'
import { canUserCreateModule, getSubscriptionErrorMessage } from '../payment/subscriptionUtils'

export type CreateModuleArgs = {
  title: string;
  description?: string;
  estimatedMinutes?: number;
};

export type UpdateModuleArgs = {
  moduleId: string;
  title?: string;
  description?: string;
  estimatedMinutes?: number;
};

export type CreateSectionArgs = {
  moduleId: string;
  title: string;
  content: string;
  orderIndex: number;
  estimatedMinutes?: number;
};

export type UpdateSectionArgs = {
  sectionId: string;
  title?: string;
  content?: string;
  orderIndex?: number;
  estimatedMinutes?: number;
};

export type ReorderSectionsArgs = {
  moduleId: string;
  sectionIds: string[];
};

// Helper function to check if user can manage modules
async function checkModuleManagementPermission(
  user: User, 
  organizationId?: string,
  context?: any,
  checkModuleLimit: boolean = false
): Promise<void> {
  // Only ADMINs or system admins can manage modules
  if (user.role !== 'ADMIN' && !user.isAdmin) {
    throw new HttpError(403, 'Only admins can manage learning modules');
  }

  // If organizationId is provided, ensure user belongs to that organization
  if (organizationId && user.organizationId !== organizationId) {
    throw new HttpError(403, 'Access denied: User not in the specified organization');
  }

  // Check subscription limits for module creation
  if (checkModuleLimit && context) {
    const currentModuleCount = await context.entities.LearningModule.count({
      where: { organizationId: user.organizationId }
    });
    
    if (!canUserCreateModule(user, currentModuleCount)) {
      throw new HttpError(402, getSubscriptionErrorMessage('create_module'));
    }
  }
}

/**
 * Create a new learning module
 */
export const createModule = async (args: CreateModuleArgs, context: any) => {
  if (!context.user) {
    throw new HttpError(401, 'User not authenticated');
  }

  if (!context.user.organizationId) {
    throw new HttpError(400, 'User must be part of an organization');
  }

  await checkModuleManagementPermission(context.user, context.user.organizationId, context, true);

  const { title, description } = args;

  if (!title?.trim()) {
    throw new HttpError(400, 'Module title is required');
  }

  try {
    const learningModule = await context.entities.LearningModule.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        originalFileName: 'Manual Creation',
        fileKey: `manual-${Date.now()}`,
        processingStatus: 'COMPLETED',
        processedContent: { sections: [] },
        creatorId: context.user.id,
        organizationId: context.user.organizationId
      },
      include: {
        sections: true,
        creator: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });

    return learningModule;
  } catch (error) {
    console.error('Error creating module:', error);
    throw new HttpError(500, 'Failed to create module');
  }
};

/**
 * Update an existing learning module
 */
export const updateModule = async (args: UpdateModuleArgs, context: any) => {
  if (!context.user) {
    throw new HttpError(401, 'User not authenticated');
  }

  const { moduleId, title, description, estimatedMinutes } = args;

  // Get the module to check permissions
  const existingModule = await context.entities.LearningModule.findUnique({
    where: { id: moduleId },
    select: { 
      id: true,
      creatorId: true,
      organizationId: true
    }
  });

  if (!existingModule) {
    throw new HttpError(404, 'Module not found');
  }

  // Check permissions
  await checkModuleManagementPermission(context.user, existingModule.organizationId);

  // Allow creator to edit their own module, or any admin
  if (existingModule.creatorId !== context.user.id && context.user.role !== 'ADMIN' && !context.user.isAdmin) {
    throw new HttpError(403, 'You can only edit modules you created or have admin privileges');
  }

  const updateData: any = {};
  
  if (title !== undefined) {
    if (!title?.trim()) {
      throw new HttpError(400, 'Module title cannot be empty');
    }
    updateData.title = title.trim();
  }
  
  if (description !== undefined) {
    updateData.description = description?.trim() || null;
  }

  try {
    const updatedModule = await context.entities.LearningModule.update({
      where: { id: moduleId },
      data: updateData,
      include: {
        sections: {
          orderBy: { orderIndex: 'asc' }
        },
        creator: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        _count: {
          select: {
            sections: true,
            assignments: true,
            progress: true
          }
        }
      }
    });

    return updatedModule;
  } catch (error) {
    console.error('Error updating module:', error);
    throw new HttpError(500, 'Failed to update module');
  }
};

/**
 * Delete a learning module
 */
export const deleteModule = async (args: { moduleId: string }, context: any) => {
  if (!context.user) {
    throw new HttpError(401, 'User not authenticated');
  }

  const { moduleId } = args;

  // Get the module to check permissions
  const existingModule = await context.entities.LearningModule.findUnique({
    where: { id: moduleId },
    select: { 
      id: true,
      creatorId: true,
      organizationId: true,
      _count: {
        select: {
          assignments: true
        }
      }
    }
  });

  if (!existingModule) {
    throw new HttpError(404, 'Module not found');
  }

  // Check permissions
  await checkModuleManagementPermission(context.user, existingModule.organizationId);

  // Allow creator to delete their own module, or any admin
  if (existingModule.creatorId !== context.user.id && context.user.role !== 'ADMIN' && !context.user.isAdmin) {
    throw new HttpError(403, 'You can only delete modules you created or have admin privileges');
  }

  // Prevent deletion if module has active assignments
  if (existingModule._count.assignments > 0) {
    throw new HttpError(400, 'Cannot delete module with active assignments');
  }

  try {
    await context.entities.LearningModule.delete({
      where: { id: moduleId }
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting module:', error);
    throw new HttpError(500, 'Failed to delete module');
  }
};

/**
 * Create a new section within a module
 */
export const createSection = async (args: CreateSectionArgs, context: any) => {
  if (!context.user) {
    throw new HttpError(401, 'User not authenticated');
  }

  const { moduleId, title, content, orderIndex, estimatedMinutes } = args;

  // Validate required fields
  if (!title?.trim()) {
    throw new HttpError(400, 'Section title is required');
  }

  if (!content?.trim()) {
    throw new HttpError(400, 'Section content is required');
  }

  // Get the module to check permissions
  const existingModule = await context.entities.LearningModule.findUnique({
    where: { id: moduleId },
    select: { 
      id: true,
      creatorId: true,
      organizationId: true
    }
  });

  if (!existingModule) {
    throw new HttpError(404, 'Module not found');
  }

  // Check permissions
  await checkModuleManagementPermission(context.user, existingModule.organizationId);

  // Allow creator to edit their own module, or any admin
  if (existingModule.creatorId !== context.user.id && context.user.role !== 'ADMIN' && !context.user.isAdmin) {
    throw new HttpError(403, 'You can only edit modules you created or have admin privileges');
  }

  try {
    // If orderIndex is not provided or conflicts, find the next available index
    let finalOrderIndex = orderIndex;
    if (finalOrderIndex === undefined || finalOrderIndex < 0) {
      const maxIndex = await context.entities.ModuleSection.aggregate({
        where: { moduleId },
        _max: { orderIndex: true }
      });
      finalOrderIndex = (maxIndex._max.orderIndex || -1) + 1;
    } else {
      // Shift existing sections if necessary
      await context.entities.ModuleSection.updateMany({
        where: {
          moduleId,
          orderIndex: { gte: finalOrderIndex }
        },
        data: {
          orderIndex: { increment: 1 }
        }
      });
    }

    const newSection = await context.entities.ModuleSection.create({
      data: {
        moduleId,
        title: title.trim(),
        content: content.trim(),
        orderIndex: finalOrderIndex,
        estimatedMinutes: estimatedMinutes || null
      }
    });

    return newSection;
  } catch (error) {
    console.error('Error creating section:', error);
    throw new HttpError(500, 'Failed to create section');
  }
};

/**
 * Update an existing section
 */
export const updateSection = async (args: UpdateSectionArgs, context: any) => {
  if (!context.user) {
    throw new HttpError(401, 'User not authenticated');
  }

  const { sectionId, title, content, orderIndex, estimatedMinutes } = args;

  // Get the section and its module to check permissions
  const existingSection = await context.entities.ModuleSection.findUnique({
    where: { id: sectionId },
    include: {
      module: {
        select: {
          id: true,
          creatorId: true,
          organizationId: true
        }
      }
    }
  });

  if (!existingSection) {
    throw new HttpError(404, 'Section not found');
  }

  // Check permissions
  await checkModuleManagementPermission(context.user, existingSection.module.organizationId);

  // Allow creator to edit their own module, or any admin
  if (existingSection.module.creatorId !== context.user.id && context.user.role !== 'ADMIN' && !context.user.isAdmin) {
    throw new HttpError(403, 'You can only edit modules you created or have admin privileges');
  }

  const updateData: any = {};
  
  if (title !== undefined) {
    if (!title?.trim()) {
      throw new HttpError(400, 'Section title cannot be empty');
    }
    updateData.title = title.trim();
  }
  
  if (content !== undefined) {
    if (!content?.trim()) {
      throw new HttpError(400, 'Section content cannot be empty');
    }
    updateData.content = content.trim();
  }

  if (estimatedMinutes !== undefined) {
    updateData.estimatedMinutes = estimatedMinutes || null;
  }

  // Handle order index change
  if (orderIndex !== undefined && orderIndex !== existingSection.orderIndex) {
    const moduleId = existingSection.moduleId;
    const oldIndex = existingSection.orderIndex;
    const newIndex = orderIndex;

    // Update other sections' order indices
    if (newIndex > oldIndex) {
      // Moving down - shift sections between old and new position up
      await context.entities.ModuleSection.updateMany({
        where: {
          moduleId,
          orderIndex: { gt: oldIndex, lte: newIndex },
          id: { not: sectionId }
        },
        data: {
          orderIndex: { decrement: 1 }
        }
      });
    } else {
      // Moving up - shift sections between new and old position down
      await context.entities.ModuleSection.updateMany({
        where: {
          moduleId,
          orderIndex: { gte: newIndex, lt: oldIndex },
          id: { not: sectionId }
        },
        data: {
          orderIndex: { increment: 1 }
        }
      });
    }

    updateData.orderIndex = newIndex;
  }

  try {
    const updatedSection = await context.entities.ModuleSection.update({
      where: { id: sectionId },
      data: updateData
    });

    return updatedSection;
  } catch (error) {
    console.error('Error updating section:', error);
    throw new HttpError(500, 'Failed to update section');
  }
};

/**
 * Delete a section
 */
export const deleteSection = async (args: { sectionId: string }, context: any) => {
  if (!context.user) {
    throw new HttpError(401, 'User not authenticated');
  }

  const { sectionId } = args;

  // Get the section and its module to check permissions
  const existingSection = await context.entities.ModuleSection.findUnique({
    where: { id: sectionId },
    include: {
      module: {
        select: {
          id: true,
          creatorId: true,
          organizationId: true
        }
      }
    }
  });

  if (!existingSection) {
    throw new HttpError(404, 'Section not found');
  }

  // Check permissions
  await checkModuleManagementPermission(context.user, existingSection.module.organizationId);

  // Allow creator to edit their own module, or any admin
  if (existingSection.module.creatorId !== context.user.id && context.user.role !== 'ADMIN' && !context.user.isAdmin) {
    throw new HttpError(403, 'You can only edit modules you created or have admin privileges');
  }

  try {
    // Delete the section
    await context.entities.ModuleSection.delete({
      where: { id: sectionId }
    });

    // Reorder remaining sections
    await context.entities.ModuleSection.updateMany({
      where: {
        moduleId: existingSection.moduleId,
        orderIndex: { gt: existingSection.orderIndex }
      },
      data: {
        orderIndex: { decrement: 1 }
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting section:', error);
    throw new HttpError(500, 'Failed to delete section');
  }
};

/**
 * Reorder sections within a module
 */
export const reorderSections = async (args: ReorderSectionsArgs, context: any) => {
  if (!context.user) {
    throw new HttpError(401, 'User not authenticated');
  }

  const { moduleId, sectionIds } = args;

  if (!sectionIds || !Array.isArray(sectionIds)) {
    throw new HttpError(400, 'Section IDs array is required');
  }

  // Get the module to check permissions
  const existingModule = await context.entities.LearningModule.findUnique({
    where: { id: moduleId },
    select: { 
      id: true,
      creatorId: true,
      organizationId: true
    }
  });

  if (!existingModule) {
    throw new HttpError(404, 'Module not found');
  }

  // Check permissions
  await checkModuleManagementPermission(context.user, existingModule.organizationId);

  // Allow creator to edit their own module, or any admin
  if (existingModule.creatorId !== context.user.id && context.user.role !== 'ADMIN' && !context.user.isAdmin) {
    throw new HttpError(403, 'You can only edit modules you created or have admin privileges');
  }

  // Verify all sections belong to the module
  const sections = await context.entities.ModuleSection.findMany({
    where: { 
      moduleId,
      id: { in: sectionIds }
    },
    select: { id: true }
  });

  if (sections.length !== sectionIds.length) {
    throw new HttpError(400, 'Some sections do not belong to this module');
  }

  try {
    // Update order indices for all sections
    const updatePromises = sectionIds.map((sectionId, index) =>
      context.entities.ModuleSection.update({
        where: { id: sectionId },
        data: { orderIndex: index }
      })
    );

    // Note: context.entities doesn't have $transaction, so we'll do them sequentially for now
    for (const promise of updatePromises) {
      await promise;
    }

    return { success: true };
  } catch (error) {
    console.error('Error reordering sections:', error);
    throw new HttpError(500, 'Failed to reorder sections');
  }
};

/**
 * Get all modules for the current user's organization
 */
export const getOrganizationModules = async (args: any, context: any) => {
  if (!context.user) {
    throw new HttpError(401, 'User not authenticated');
  }

  if (!context.user.organizationId) {
    throw new HttpError(400, 'User must be part of an organization');
  }

  try {
    const modules = await context.entities.LearningModule.findMany({
      where: {
        organizationId: context.user.organizationId
      },
      include: {
        sections: {
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            title: true,
            orderIndex: true,
            estimatedMinutes: true
          }
        },
        creator: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        _count: {
          select: {
            sections: true,
            assignments: true,
            progress: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return modules;
  } catch (error) {
    console.error('Error fetching organization modules:', error);
    throw new HttpError(500, 'Failed to fetch modules');
  }
};

/**
 * Get a single module with full details
 */
export const getModuleDetails = async (
  args: { moduleId: string },
  context: any
) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be authenticated');
  }

  const { moduleId } = args;

  try {
    const module = await context.entities.LearningModule.findUnique({
      where: { id: moduleId },
      include: {
        sections: {
          orderBy: { orderIndex: 'asc' }
        },
        creator: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        organization: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            sections: true,
            assignments: true,
            progress: true
          }
        }
      }
    });

    if (!module) {
      throw new HttpError(404, 'Module not found');
    }

    // Check access permissions
    if (module.organizationId !== context.user.organizationId) {
      throw new HttpError(403, 'Access denied: Module not in your organization');
    }

    return module;
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    console.error('Error fetching module details:', error);
    throw new HttpError(500, 'Failed to fetch module details');
  }
};
