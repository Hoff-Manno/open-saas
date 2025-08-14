import type { OnAfterSignupHook, OnBeforeOAuthRedirectHook } from 'wasp/server/auth';
import { prisma } from 'wasp/server';
import { emailSender } from 'wasp/server/email';

// Store invitation tokens temporarily during OAuth flow
const invitationStore = new Map<string, { email: string; organizationId: string; role: 'ADMIN' | 'LEARNER' }>();

export const onBeforeOAuthRedirect: OnBeforeOAuthRedirectHook = async ({ oauth, req, url }) => {
  // Check if there's an invitation token in the query parameters
  const invitationToken = req.query.invitation as string;
  
  if (invitationToken) {
    try {
      // Decode and validate the invitation token
      const decoded = JSON.parse(Buffer.from(invitationToken, 'base64').toString());
      const { email, organizationId, role, timestamp } = decoded;

      // Check if token is expired (7 days)
      const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - timestamp > SEVEN_DAYS) {
        console.error('Invitation token expired during OAuth redirect');
        return { url };
      }

      // Store the invitation data using the unique request ID
      invitationStore.set(oauth.uniqueRequestId, { email, organizationId, role });
      
      console.log('Stored invitation data for OAuth flow:', { email, organizationId, role });
    } catch (error) {
      console.error('Error processing invitation token during OAuth redirect:', error);
    }
  }
  
  return { url };
};

export const onAfterSignup: OnAfterSignupHook = async ({ providerId, user, oauth }) => {
  console.log('User signed up:', { providerId, userId: user.id, email: user.email });

  // Check if this signup was part of an invitation flow
  if (oauth?.uniqueRequestId && invitationStore.has(oauth.uniqueRequestId)) {
    const invitationData = invitationStore.get(oauth.uniqueRequestId)!;
    
    try {
      // Verify the invitation is for this user's email
      if (user.email === invitationData.email) {
        console.log('Processing team invitation for user:', user.email);

        // Check if organization exists
        const organization = await prisma.organization.findUnique({
          where: { id: invitationData.organizationId },
          select: { id: true, name: true, maxUsers: true }
        });

        if (!organization) {
          console.error('Organization not found for invitation:', invitationData.organizationId);
          return;
        }

        // Check user limits
        if (organization.maxUsers) {
          const currentUserCount = await prisma.user.count({
            where: { organizationId: invitationData.organizationId }
          });
          if (currentUserCount >= organization.maxUsers) {
            console.error('Organization has reached its user limit');
            return;
          }
        }

        // Update user with organization and role
        await prisma.user.update({
          where: { id: user.id },
          data: {
            organizationId: invitationData.organizationId,
            role: invitationData.role,
          }
        });

        console.log('Successfully assigned user to organization:', {
          userId: user.id,
          organizationId: invitationData.organizationId,
          role: invitationData.role
        });

        // Send welcome email
        if (user.email) {
          try {
            const dashboardLink = `${process.env.WASP_WEB_CLIENT_URL}/learning-modules`;
            
            await emailSender.send({
              to: user.email,
              subject: `Welcome to ${organization.name}!`,
              text: `Welcome! You've successfully joined ${organization.name} as a ${invitationData.role.toLowerCase()}. Visit ${dashboardLink} to get started.`,
              html: `
                <h1>Welcome to ${organization.name}!</h1>
                <p>You've successfully joined as a <strong>${invitationData.role.toLowerCase()}</strong>.</p>
                <p><a href="${dashboardLink}">Get started with your learning modules</a></p>
              `,
            });

            console.log('Welcome email sent to:', user.email);
          } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
            // Don't fail the signup if email fails
          }
        }
      } else {
        console.error('Invitation email mismatch:', {
          userEmail: user.email,
          invitationEmail: invitationData.email
        });
      }
    } catch (error) {
      console.error('Error processing team invitation after signup:', error);
    } finally {
      // Clean up the stored invitation data
      invitationStore.delete(oauth.uniqueRequestId);
    }
  }

  // Handle regular signup (non-invitation) logic here if needed
  console.log('User signup completed successfully');
};

// Helper function to verify invitation tokens (shared with userSignupFields)
export function verifyInvitationToken(token: string): { email: string; organizationId: string; role: 'ADMIN' | 'LEARNER' } {
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