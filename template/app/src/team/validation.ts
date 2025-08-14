// Team Management Validation
import { type User, type LearningModule } from 'wasp/entities';
import { type Context } from 'wasp/server/operations';
import { 
  PermissionError, 
  ValidationError, 
  SubscriptionError,
  ErrorCode,
  createHttpError,
  handleError 
} from '../shared/errors';
import { 
  validateTeamMembership, 
  validateOrganizationAdmin,
  validateModuleAssignment,
  validateSubscriptionLimits 
} from '../shared/validation';
import { checkRateLimit } from '../shared/rateLimiting';
import { healthChecker } from '../shared/monitoring';

// Team invitation validation
export async function validateTeamInvitation(
  inviterId: string,
  inviteeEmail: string,
  organizationId: string,
  context: Context
): Promise<void> {
  // Validate inviter permissions
  await validateOrganizationAdmin(inviterId, organizationId, context);
  
  // Check subscription limits
  const inviter = await context.entities.User.findUnique({
    where: { id: inviterId },
    select: { subscriptionPlan: true, subscriptionStatus: true },
  });
  
  if (inviter) {
    await validateSubscriptionLimits(inviter, 'add_user', context);
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(inviteeEmail)) {
    throw new ValidationError('Invalid email address format', 'email');
  }
  
  // Check if user is already in the organization
  const existingUser = await context.entities.User.findUnique({
    where: { email: inviteeEmail },
    select: { id: true, organizationId: true },
  });
  
  if (existingUser && existingUser.organizationId === organizationId) {
    throw new ValidationError('User is already a member of this organization');
  }
  
  // Check for pending invitations (if you have an invitations table)
  // This would prevent spam invitations
}

// Team member removal validation
export async function validateTeamMemberRemoval(
  removerId: string,
  targetUserId: string,
  organizationId: string,
  context: Context
): Promise<void> {
  // Validate remover permissions
  await validateOrganizationAdmin(removerId, organizationId, context);
  
  // Validate target user exists and is in organization
  await validateTeamMembership(targetUserId, organizationId, context);
  
  // Prevent self-removal if user is the only admin
  if (removerId === targetUserId) {
    const adminCount = await context.entities.User.count({
      where: {
        organizationId,
        role: 'ADMIN',
      },
    });
    
    if (adminCount <= 1) {
      throw new ValidationError(
        'Cannot remove the last administrator from the organization'
      );
    }
  }
  
  // Check if user has active assignments
  const activeAssignments = await context.entities.ModuleAssignment.count({
    where: {
      userId: targetUserId,
      completedAt: null, // Not completed
    },
  });
  
  if (activeAssignments > 0) {
    throw new ValidationError(
      `User has ${activeAssignments} active learning assignments. Please reassign or complete them first.`
    );
  }
}

// Role change validation
export async function validateRoleChange(
  changerId: string,
  targetUserId: string,
  newRole: 'ADMIN' | 'LEARNER',
  organizationId: string,
  context: Context
): Promise<void> {
  // Validate changer permissions
  await validateOrganizationAdmin(changerId, organizationId, context);
  
  // Validate target user exists and is in organization
  await validateTeamMembership(targetUserId, organizationId, context);
  
  const targetUser = await context.entities.User.findUnique({
    where: { id: targetUserId },
    select: { role: true },
  });
  
  if (!targetUser) {
    throw new ValidationError('Target user not found');
  }
  
  // If demoting from admin, ensure there's at least one admin left
  if (targetUser.role === 'ADMIN' && newRole === 'LEARNER') {
    const adminCount = await context.entities.User.count({
      where: {
        organizationId,
        role: 'ADMIN',
      },
    });
    
    if (adminCount <= 1) {
      throw new ValidationError(
        'Cannot demote the last administrator. Promote another user to admin first.'
      );
    }
  }
}

// Bulk assignment validation
export async function validateBulkModuleAssignment(
  assignerId: string,
  userIds: string[],
  moduleIds: string[],
  organizationId: string,
  context: Context
): Promise<void> {
  // Validate assigner permissions
  await validateOrganizationAdmin(assignerId, organizationId, context);
  
  // Validate batch sizes
  if (userIds.length > 100) {
    throw new ValidationError('Cannot assign to more than 100 users at once');
  }
  
  if (moduleIds.length > 50) {
    throw new ValidationError('Cannot assign more than 50 modules at once');
  }
  
  // Validate all users are in the organization
  for (const userId of userIds) {
    await validateTeamMembership(userId, organizationId, context);
  }
  
  // Validate all modules are accessible
  for (const moduleId of moduleIds) {
    await validateModuleAssignment(assignerId, userIds[0], moduleId, context);
  }
  
  // Check for existing assignments to prevent duplicates
  const existingAssignments = await context.entities.ModuleAssignment.findMany({
    where: {
      userId: { in: userIds },
      moduleId: { in: moduleIds },
    },
    select: { userId: true, moduleId: true },
  });
  
  if (existingAssignments.length > 0) {
    throw new ValidationError(
      `${existingAssignments.length} assignments already exist and will be skipped`
    );
  }
}

// Organization settings validation
export async function validateOrganizationSettings(
  userId: string,
  organizationId: string,
  settings: {
    name?: string;
    maxModules?: number;
    maxUsers?: number;
    subscriptionTier?: string;
  },
  context: Context
): Promise<void> {
  // Validate user permissions
  await validateOrganizationAdmin(userId, organizationId, context);
  
  // Validate organization name
  if (settings.name !== undefined) {
    if (!settings.name || settings.name.trim().length === 0) {
      throw new ValidationError('Organization name is required', 'name');
    }
    
    if (settings.name.length > 100) {
      throw new ValidationError('Organization name must be less than 100 characters', 'name');
    }
    
    // Check for duplicate names (if required)
    const existingOrg = await context.entities.Organization.findFirst({
      where: {
        name: settings.name,
        id: { not: organizationId },
      },
    });
    
    if (existingOrg) {
      throw new ValidationError('An organization with this name already exists', 'name');
    }
  }
  
  // Validate limits (if being set manually - usually subscription-controlled)
  if (settings.maxModules !== undefined && settings.maxModules < 0) {
    throw new ValidationError('Maximum modules must be a positive number', 'maxModules');
  }
  
  if (settings.maxUsers !== undefined && settings.maxUsers < 1) {
    throw new ValidationError('Maximum users must be at least 1', 'maxUsers');
  }
  
  // Validate subscription tier
  if (settings.subscriptionTier !== undefined) {
    const validTiers = ['STARTER', 'PROFESSIONAL', 'ENTERPRISE'];
    if (!validTiers.includes(settings.subscriptionTier)) {
      throw new ValidationError(
        `Invalid subscription tier. Must be one of: ${validTiers.join(', ')}`,
        'subscriptionTier'
      );
    }
  }
}

// Team statistics validation
export async function validateTeamStatsAccess(
  userId: string,
  organizationId: string,
  context: Context
): Promise<void> {
  // Validate user has access to organization
  await validateTeamMembership(userId, organizationId, context);
  
  // For detailed stats, require admin access
  const user = await context.entities.User.findUnique({
    where: { id: userId },
    select: { role: true, isAdmin: true },
  });
  
  if (!user) {
    throw new ValidationError('User not found');
  }
  
  if (user.role !== 'ADMIN' && !user.isAdmin) {
    throw new PermissionError(
      'Administrator privileges required to view detailed team statistics',
      'ADMIN',
      'view_team_stats'
    );
  }
}

// Progress report validation
export async function validateProgressReportAccess(
  requesterId: string,
  targetUserId: string | null, // null for all users
  organizationId: string,
  context: Context
): Promise<void> {
  // Validate requester permissions
  await validateOrganizationAdmin(requesterId, organizationId, context);
  
  // If requesting specific user's progress, validate they're in the organization
  if (targetUserId) {
    await validateTeamMembership(targetUserId, organizationId, context);
  }
}

// Export validation helper
export async function validateDataExport(
  userId: string,
  organizationId: string,
  exportType: 'users' | 'progress' | 'modules' | 'all',
  context: Context
): Promise<void> {
  // Validate user permissions
  await validateOrganizationAdmin(userId, organizationId, context);
  
  // Rate limiting for exports
  await checkRateLimit(userId, 'API_GENERAL');
  
  // Validate export type
  const validTypes = ['users', 'progress', 'modules', 'all'];
  if (!validTypes.includes(exportType)) {
    throw new ValidationError(
      `Invalid export type. Must be one of: ${validTypes.join(', ')}`,
      'exportType'
    );
  }
  
  // Check subscription permissions for data export
  const user = await context.entities.User.findUnique({
    where: { id: userId },
    select: { subscriptionPlan: true, subscriptionStatus: true },
  });
  
  if (user && exportType === 'all') {
    // Full data export might be restricted to higher tiers
    if (user.subscriptionPlan !== 'enterprise') {
      throw new SubscriptionError(
        'Full data export is only available for Enterprise subscribers',
        'enterprise',
        user.subscriptionPlan || 'none'
      );
    }
  }
}