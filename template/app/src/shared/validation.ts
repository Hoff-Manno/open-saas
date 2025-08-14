// Comprehensive Validation System
import { type User, type LearningModule, type Organization } from 'wasp/entities';
import { type Context } from 'wasp/server/operations';
import { PermissionError, SubscriptionError, ValidationError, ErrorCode } from './errors';
import { getUserSubscriptionPlan, canUserCreateModule, canUserAddTeamMember } from '../payment/subscriptionUtils';

// Team membership validation
export async function validateTeamMembership(
  userId: string,
  organizationId: string,
  context: Context
): Promise<void> {
  const user = await context.entities.User.findUnique({
    where: { id: userId },
    include: { organization: true },
  });

  if (!user) {
    throw new PermissionError('User not found');
  }

  if (user.organizationId !== organizationId) {
    throw new PermissionError(
      'User is not a member of this organization',
      undefined,
      'access_organization'
    );
  }
}

// Module access validation
export async function validateModuleAccess(
  userId: string,
  moduleId: string,
  context: Context,
  requireOwnership: boolean = false
): Promise<LearningModule> {
  const user = await context.entities.User.findUnique({
    where: { id: userId },
    select: { id: true, organizationId: true, isAdmin: true, role: true },
  });

  if (!user) {
    throw new PermissionError('User not found');
  }

  const module = await context.entities.LearningModule.findUnique({
    where: { id: moduleId },
    include: {
      creator: true,
      assignments: {
        where: { userId },
        select: { id: true },
      },
    },
  });

  if (!module) {
    throw new ValidationError('Learning module not found');
  }

  // Check organization membership
  if (module.organizationId !== user.organizationId) {
    throw new PermissionError(
      'You do not have access to this learning module',
      undefined,
      'access_module'
    );
  }

  // Check ownership if required
  if (requireOwnership) {
    if (module.creatorId !== userId && !user.isAdmin) {
      throw new PermissionError(
        'You must be the module creator or an admin to perform this action',
        'ADMIN',
        'modify_module'
      );
    }
  } else {
    // Check if user has access (creator, assigned, or admin)
    const hasAccess = 
      module.creatorId === userId ||
      module.assignments.length > 0 ||
      user.isAdmin;

    if (!hasAccess) {
      throw new PermissionError(
        'You do not have access to this learning module',
        undefined,
        'access_module'
      );
    }
  }

  return module;
}

// Admin role validation
export function validateAdminRole(user: User): void {
  if (!user.isAdmin) {
    throw new PermissionError(
      'Administrator privileges are required for this action',
      'ADMIN',
      'admin_action'
    );
  }
}

// Organization admin validation
export async function validateOrganizationAdmin(
  userId: string,
  organizationId: string,
  context: Context
): Promise<void> {
  const user = await context.entities.User.findUnique({
    where: { id: userId },
    select: { id: true, organizationId: true, role: true, isAdmin: true },
  });

  if (!user) {
    throw new PermissionError('User not found');
  }

  if (user.organizationId !== organizationId) {
    throw new PermissionError(
      'You do not have access to this organization',
      undefined,
      'access_organization'
    );
  }

  if (user.role !== 'ADMIN' && !user.isAdmin) {
    throw new PermissionError(
      'Organization administrator privileges are required',
      'ADMIN',
      'organization_admin'
    );
  }
}

// Subscription validation
export async function validateSubscriptionLimits(
  user: User,
  action: 'create_module' | 'add_user' | 'api_access',
  context: Context
): Promise<void> {
  const plan = getUserSubscriptionPlan(user);
  
  if (!plan) {
    throw new SubscriptionError(
      'An active subscription is required to perform this action',
      'any',
      'none'
    );
  }

  if (action === 'create_module') {
    if (user.organizationId) {
      const currentModuleCount = await context.entities.LearningModule.count({
        where: { organizationId: user.organizationId },
      });

      if (!canUserCreateModule(user, currentModuleCount)) {
        throw new SubscriptionError(
          'You have reached your module limit. Please upgrade your subscription.',
          'higher_tier',
          plan
        );
      }
    }
  }

  if (action === 'add_user') {
    if (user.organizationId) {
      const currentUserCount = await context.entities.User.count({
        where: { organizationId: user.organizationId },
      });

      if (!canUserAddTeamMember(user, currentUserCount)) {
        throw new SubscriptionError(
          'You have reached your team member limit. Please upgrade your subscription.',
          'higher_tier',
          plan
        );
      }
    }
  }

  if (action === 'api_access') {
    if (plan !== 'enterprise') {
      throw new SubscriptionError(
        'API access is only available for Enterprise subscribers.',
        'enterprise',
        plan
      );
    }
  }
}

// File validation
export interface FileValidationOptions {
  maxSizeBytes: number;
  allowedTypes: string[];
  requirePDF?: boolean;
}

export function validateFile(
  file: { name: string; type: string; size: number },
  options: FileValidationOptions
): void {
  // Check file type
  if (!options.allowedTypes.includes(file.type)) {
    throw new ValidationError(
      `File type ${file.type} is not allowed. Allowed types: ${options.allowedTypes.join(', ')}`,
      'fileType'
    );
  }

  // Check PDF requirement
  if (options.requirePDF && file.type !== 'application/pdf') {
    throw new ValidationError(
      'Only PDF files are allowed for this operation',
      'fileType'
    );
  }

  // Check file size
  if (file.size > options.maxSizeBytes) {
    const maxSizeMB = Math.round(options.maxSizeBytes / (1024 * 1024));
    throw new ValidationError(
      `File size exceeds the maximum limit of ${maxSizeMB}MB`,
      'fileSize'
    );
  }

  // Check file name
  if (!file.name || file.name.trim().length === 0) {
    throw new ValidationError('File name is required', 'fileName');
  }

  // Check for potentially dangerous file names
  const dangerousPatterns = [
    /\.\./,  // Directory traversal
    /[<>:"|?*]/,  // Invalid filename characters
    /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i,  // Windows reserved names
  ];

  if (dangerousPatterns.some(pattern => pattern.test(file.name))) {
    throw new ValidationError('File name contains invalid characters', 'fileName');
  }
}

// Progress validation
export function validateProgressUpdate(
  progress: { completed: boolean; timeSpent: number; bookmarkPosition?: string }
): void {
  if (typeof progress.completed !== 'boolean') {
    throw new ValidationError('Completion status must be a boolean', 'completed');
  }

  if (typeof progress.timeSpent !== 'number' || progress.timeSpent < 0) {
    throw new ValidationError('Time spent must be a non-negative number', 'timeSpent');
  }

  if (progress.timeSpent > 24 * 60) { // More than 24 hours seems unrealistic
    throw new ValidationError('Time spent seems unrealistic', 'timeSpent');
  }

  if (progress.bookmarkPosition) {
    try {
      JSON.parse(progress.bookmarkPosition);
    } catch {
      throw new ValidationError('Bookmark position must be valid JSON', 'bookmarkPosition');
    }
  }
}

// Module assignment validation
export async function validateModuleAssignment(
  assignerId: string,
  assigneeId: string,
  moduleId: string,
  context: Context
): Promise<void> {
  // Validate assigner permissions
  const assigner = await context.entities.User.findUnique({
    where: { id: assignerId },
    select: { id: true, organizationId: true, role: true, isAdmin: true },
  });

  if (!assigner) {
    throw new PermissionError('Assigner not found');
  }

  if (assigner.role !== 'ADMIN' && !assigner.isAdmin) {
    throw new PermissionError(
      'Only administrators can assign modules to users',
      'ADMIN',
      'assign_module'
    );
  }

  // Validate assignee exists and is in same organization
  const assignee = await context.entities.User.findUnique({
    where: { id: assigneeId },
    select: { id: true, organizationId: true },
  });

  if (!assignee) {
    throw new ValidationError('Assignee not found');
  }

  if (assignee.organizationId !== assigner.organizationId) {
    throw new PermissionError(
      'Cannot assign modules to users outside your organization',
      undefined,
      'assign_module'
    );
  }

  // Validate module exists and is accessible
  await validateModuleAccess(assignerId, moduleId, context, false);

  // Check if assignment already exists
  const existingAssignment = await context.entities.ModuleAssignment.findUnique({
    where: {
      userId_moduleId: {
        userId: assigneeId,
        moduleId: moduleId,
      },
    },
  });

  if (existingAssignment) {
    throw new ValidationError('User is already assigned to this module');
  }
}

// Batch validation helper
export async function validateBatch<T>(
  items: T[],
  validator: (item: T) => Promise<void> | void,
  maxBatchSize: number = 100
): Promise<void> {
  if (items.length > maxBatchSize) {
    throw new ValidationError(`Batch size cannot exceed ${maxBatchSize} items`);
  }

  const errors: Array<{ index: number; error: Error }> = [];

  for (let i = 0; i < items.length; i++) {
    try {
      await validator(items[i]);
    } catch (error) {
      errors.push({ index: i, error: error as Error });
    }
  }

  if (errors.length > 0) {
    throw new ValidationError(
      `Validation failed for ${errors.length} items`,
      'batch',
      JSON.stringify(errors.map(e => ({ index: e.index, message: e.error.message })))
    );
  }
}