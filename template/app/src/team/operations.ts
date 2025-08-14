import { type Prisma } from '@prisma/client';
import { type User, type LearningModule, type ModuleAssignment } from 'wasp/entities';
import { HttpError, prisma } from 'wasp/server';
import { emailSender } from 'wasp/server/email';
import { type CreateTeamInvitation, type AcceptTeamInvitation, type AssignModuleToUsers, type GetTeamUsers, type UpdateUserRole } from 'wasp/server/operations';
import * as z from 'zod';
import { ensureArgsSchemaOrThrowHttpError } from '../server/validation';
import { getTeamInvitationEmailContent, getModuleAssignmentEmailContent, getTeamWelcomeEmailContent } from './emails';
import { canUserAddTeamMember, getSubscriptionErrorMessage } from '../payment/subscriptionUtils';

// Input schemas
const createTeamInvitationSchema = z.object({
  email: z.string().email(),
  organizationId: z.string(),
  role: z.enum(['ADMIN', 'LEARNER']),
});

const acceptTeamInvitationSchema = z.object({
  invitationToken: z.string(),
});

const assignModuleToUsersSchema = z.object({
  moduleId: z.string(),
  userIds: z.array(z.string()),
  dueDate: z.string().datetime().optional(),
});

const getTeamUsersSchema = z.object({
  organizationId: z.string().optional(),
  skipPages: z.number().default(0),
  filter: z.object({
    emailContains: z.string().optional(),
    role: z.enum(['ADMIN', 'LEARNER']).optional(),
  }).optional(),
});

const updateUserRoleSchema = z.object({
  userId: z.string(),
  role: z.enum(['ADMIN', 'LEARNER']),
  organizationId: z.string().optional(),
});

type CreateTeamInvitationInput = z.infer<typeof createTeamInvitationSchema>;
type AcceptTeamInvitationInput = z.infer<typeof acceptTeamInvitationSchema>;
type AssignModuleToUsersInput = z.infer<typeof assignModuleToUsersSchema>;
type GetTeamUsersInput = z.infer<typeof getTeamUsersSchema>;
type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

// Team invitation operations
export const createTeamInvitation: CreateTeamInvitation<CreateTeamInvitationInput, { success: boolean; message: string }> = async (
  rawArgs,
  context
) => {
  const args = ensureArgsSchemaOrThrowHttpError(createTeamInvitationSchema, rawArgs);

  if (!context.user) {
    throw new HttpError(401, 'User not authenticated');
  }

  // Check if user is admin (either system admin or organization admin)
  if (!context.user.isAdmin && context.user.role !== 'ADMIN') {
    throw new HttpError(403, 'Only admins can send team invitations');
  }

  // If not system admin, verify user belongs to the organization
  if (!context.user.isAdmin && context.user.organizationId !== args.organizationId) {
    throw new HttpError(403, 'You can only invite users to your own organization');
  }

  // Check if user is already in the system
  const existingUser = await context.entities.User.findUnique({
    where: { email: args.email },
    select: { id: true, organizationId: true, email: true }
  });

  if (existingUser?.organizationId === args.organizationId) {
    throw new HttpError(400, 'User is already a member of this organization');
  }

  const organization = await context.entities.Organization.findUnique({
    where: { id: args.organizationId },
    select: { name: true, maxUsers: true }
  });

  if (!organization) {
    throw new HttpError(404, 'Organization not found');
  }

  // Check subscription-based user limits
  const currentUserCount = await context.entities.User.count({
    where: { organizationId: args.organizationId }
  });
  
  if (!canUserAddTeamMember(context.user, currentUserCount)) {
    throw new HttpError(402, getSubscriptionErrorMessage('add_user'));
  }

  // Generate invitation token
  const invitationToken = generateInvitationToken(args.email, args.organizationId, args.role);

  try {
    // Send invitation email with professional template
    const invitationLink = `${process.env.CLIENT_URL}/accept-invitation?token=${invitationToken}`;
    const emailContent = getTeamInvitationEmailContent({
      organizationName: organization.name,
      inviterName: context.user.email || context.user.username || 'Team Admin',
      role: args.role,
      invitationLink,
    });

    await emailSender.send({
      to: args.email,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    });

    return { 
      success: true, 
      message: `Invitation sent successfully to ${args.email}` 
    };
  } catch (error) {
    console.error('Error sending invitation email:', error);
    throw new HttpError(500, 'Failed to send invitation email');
  }
};

export const acceptTeamInvitation: AcceptTeamInvitation<AcceptTeamInvitationInput, { success: boolean; message: string }> = async (
  rawArgs,
  context
) => {
  const args = ensureArgsSchemaOrThrowHttpError(acceptTeamInvitationSchema, rawArgs);

  if (!context.user) {
    throw new HttpError(401, 'User not authenticated');
  }

  try {
    const { email, organizationId, role } = verifyInvitationToken(args.invitationToken);

    if (email !== context.user.email) {
      throw new HttpError(403, 'This invitation is not for your email address');
    }

    // Check if user is already in an organization
    if (context.user.organizationId) {
      throw new HttpError(400, 'You are already a member of an organization');
    }

    // Update user with organization and role
    const updatedUser = await context.entities.User.update({
      where: { id: context.user.id },
      data: {
        organizationId,
        role,
      },
    });

    // Send welcome email
    try {
      const dashboardLink = `${process.env.CLIENT_URL}/demo-app`;
      const organization = await context.entities.Organization.findUnique({
        where: { id: organizationId },
        select: { name: true }
      });

      if (organization && updatedUser.email) {
        const welcomeEmailContent = getTeamWelcomeEmailContent({
          userEmail: updatedUser.email,
          username: updatedUser.username || undefined,
          organizationName: organization.name,
          role,
          dashboardLink,
        });

        await emailSender.send({
          to: updatedUser.email,
          subject: welcomeEmailContent.subject,
          text: welcomeEmailContent.text,
          html: welcomeEmailContent.html,
        });
      }
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail the operation if email fails
    }

    return {
      success: true,
      message: 'Successfully joined the organization!'
    };
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    console.error('Error accepting invitation:', error);
    throw new HttpError(400, 'Invalid or expired invitation token');
  }
};

// Module assignment operations
export const assignModuleToUsers: AssignModuleToUsers<AssignModuleToUsersInput, { success: boolean; assignedCount: number }> = async (
  rawArgs,
  context
) => {
  const args = ensureArgsSchemaOrThrowHttpError(assignModuleToUsersSchema, rawArgs);

  if (!context.user) {
    throw new HttpError(401, 'User not authenticated');
  }

  // Check permissions
  if (!context.user.isAdmin && context.user.role !== 'ADMIN') {
    throw new HttpError(403, 'Only admins can assign modules');
  }

  // Get the module to check permissions
  const module = await context.entities.LearningModule.findUnique({
    where: { id: args.moduleId },
    select: { 
      id: true, 
      title: true, 
      organizationId: true, 
      organization: { select: { name: true } } 
    }
  });

  if (!module) {
    throw new HttpError(404, 'Learning module not found');
  }

  // If not system admin, verify user belongs to the same organization
  if (!context.user.isAdmin && context.user.organizationId !== module.organizationId) {
    throw new HttpError(403, 'You can only assign modules from your organization');
  }

  // Get users and validate they exist and belong to the same organization
  const users = await context.entities.User.findMany({
    where: {
      id: { in: args.userIds },
      organizationId: module.organizationId,
    },
    select: { id: true, email: true, username: true }
  });

  if (users.length !== args.userIds.length) {
    throw new HttpError(400, 'Some users not found or not in the same organization');
  }

  let assignedCount = 0;

  // Create assignments and send notifications
  for (const user of users) {
    try {
      // Check if assignment already exists
      const existingAssignment = await context.entities.ModuleAssignment.findUnique({
        where: {
          userId_moduleId: {
            userId: user.id,
            moduleId: args.moduleId,
          }
        }
      });

      if (!existingAssignment) {
        // Create new assignment
        await context.entities.ModuleAssignment.create({
          data: {
            userId: user.id,
            moduleId: args.moduleId,
            dueDate: args.dueDate ? new Date(args.dueDate) : undefined,
          }
        });

        assignedCount++;

        // Send notification email
        if (user.email) {
          try {
            const moduleLink = `${process.env.CLIENT_URL}/learning`;
            const emailContent = getModuleAssignmentEmailContent({
              userEmail: user.email,
              username: user.username || undefined,
              moduleTitle: module.title,
              organizationName: module.organization.name,
              dueDate: args.dueDate ? new Date(args.dueDate) : undefined,
              moduleLink,
            });

            await emailSender.send({
              to: user.email,
              subject: emailContent.subject,
              text: emailContent.text,
              html: emailContent.html,
            });
          } catch (emailError) {
            console.error(`Failed to send assignment notification to ${user.email}:`, emailError);
          }
        }
      }
    } catch (assignmentError) {
      console.error(`Failed to assign module to user ${user.id}:`, assignmentError);
    }
  }

  return {
    success: true,
    assignedCount,
  };
};

// Team user management operations
export const getTeamUsers: GetTeamUsers<GetTeamUsersInput, {
  users: Array<Pick<User, 'id' | 'email' | 'username' | 'role' | 'createdAt' | 'organizationId'>>;
  totalPages: number;
}> = async (rawArgs, context) => {
  const args = ensureArgsSchemaOrThrowHttpError(getTeamUsersSchema, rawArgs);

  if (!context.user) {
    throw new HttpError(401, 'User not authenticated');
  }

  // Check permissions
  if (!context.user.isAdmin && context.user.role !== 'ADMIN') {
    throw new HttpError(403, 'Only admins can view team users');
  }

  const pageSize = 10;
  const organizationId = args.organizationId || context.user.organizationId;

  if (!context.user.isAdmin && organizationId !== context.user.organizationId) {
    throw new HttpError(403, 'You can only view users from your organization');
  }

  const where: Prisma.UserWhereInput = {
    organizationId,
    ...(args.filter?.emailContains && {
      email: {
        contains: args.filter.emailContains,
        mode: 'insensitive',
      }
    }),
    ...(args.filter?.role && { role: args.filter.role }),
  };

  const [users, totalUsers] = await Promise.all([
    context.entities.User.findMany({
      where,
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        createdAt: true,
        organizationId: true,
      },
      skip: args.skipPages * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    context.entities.User.count({ where }),
  ]);

  const totalPages = Math.ceil(totalUsers / pageSize);

  return { users, totalPages };
};

export const updateUserRole: UpdateUserRole<UpdateUserRoleInput, User> = async (rawArgs, context) => {
  const args = ensureArgsSchemaOrThrowHttpError(updateUserRoleSchema, rawArgs);

  if (!context.user) {
    throw new HttpError(401, 'User not authenticated');
  }

  // Check permissions
  if (!context.user.isAdmin && context.user.role !== 'ADMIN') {
    throw new HttpError(403, 'Only admins can update user roles');
  }

  // Get target user
  const targetUser = await context.entities.User.findUnique({
    where: { id: args.userId },
    select: { id: true, organizationId: true, email: true }
  });

  if (!targetUser) {
    throw new HttpError(404, 'User not found');
  }

  const organizationId = args.organizationId || targetUser.organizationId;

  // If not system admin, verify both users are in the same organization
  if (!context.user.isAdmin && 
      (context.user.organizationId !== organizationId || targetUser.organizationId !== organizationId)) {
    throw new HttpError(403, 'You can only update roles for users in your organization');
  }

  // Prevent users from changing their own role
  if (context.user.id === args.userId) {
    throw new HttpError(400, 'You cannot change your own role');
  }

  return context.entities.User.update({
    where: { id: args.userId },
    data: { 
      role: args.role,
      ...(args.organizationId && { organizationId: args.organizationId })
    },
  });
};

// Helper functions
function generateInvitationToken(email: string, organizationId: string, role: string): string {
  // In a real app, you'd use JWT or a more secure token system
  // For this implementation, we'll use a simple base64 encoding with timestamp
  const payload = {
    email,
    organizationId,
    role,
    timestamp: Date.now(),
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

function verifyInvitationToken(token: string): { email: string; organizationId: string; role: 'ADMIN' | 'LEARNER' } {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    const { email, organizationId, role, timestamp } = decoded;

    // Check if token is expired (7 days)
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - timestamp > SEVEN_DAYS) {
      throw new Error('Token expired');
    }

    return { email, organizationId, role };
  } catch (error) {
    throw new Error('Invalid token');
  }
}
