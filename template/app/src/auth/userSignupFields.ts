import { z } from 'zod';
import { defineUserSignupFields } from 'wasp/auth/providers/types';

const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];

const emailDataSchema = z.object({
  email: z.string(),
});

export const getEmailUserFields = defineUserSignupFields({
  email: (data) => {
    const emailData = emailDataSchema.parse(data);
    return emailData.email;
  },
  username: (data) => {
    const emailData = emailDataSchema.parse(data);
    return emailData.email;
  },
  isAdmin: (data) => {
    const emailData = emailDataSchema.parse(data);
    return adminEmails.includes(emailData.email);
  },
});

const githubDataSchema = z.object({
  profile: z.object({
    emails: z
      .array(
        z.object({
          email: z.string(),
          verified: z.boolean(),
        })
      )
      .min(1, 'You need to have an email address associated with your GitHub account to sign up.'),
    login: z.string(),
  }),
});

export const getGitHubUserFields = defineUserSignupFields({
  email: (data) => {
    const githubData = githubDataSchema.parse(data);
    return getGithubEmailInfo(githubData).email;
  },
  username: (data) => {
    const githubData = githubDataSchema.parse(data);
    return githubData.profile.login;
  },
  isAdmin: (data) => {
    const githubData = githubDataSchema.parse(data);
    const emailInfo = getGithubEmailInfo(githubData);
    if (!emailInfo.verified) {
      return false;
    }
    return adminEmails.includes(emailInfo.email);
  },
});

// We are using the first email from the list of emails returned by GitHub.
// If you want to use a different email, you can modify this function.
function getGithubEmailInfo(githubData: z.infer<typeof githubDataSchema>) {
  return githubData.profile.emails[0];
}

// NOTE: if we don't want to access users' emails, we can use scope ["user:read"]
// instead of ["user"] and access args.profile.username instead
export function getGitHubAuthConfig() {
  return {
    scopes: ['user'],
  };
}

const googleDataSchema = z.object({
  profile: z.object({
    email: z.string(),
    email_verified: z.boolean(),
    name: z.string().optional(),
    given_name: z.string().optional(),
    family_name: z.string().optional(),
  }),
  request: z.object({
    query: z.object({
      invitation: z.string().optional(),
    }).optional(),
  }).optional(),
});

export const getGoogleUserFields = defineUserSignupFields({
  email: (data) => {
    const googleData = googleDataSchema.parse(data);
    return googleData.profile.email;
  },
  username: (data) => {
    const googleData = googleDataSchema.parse(data);
    // Use name if available, otherwise fall back to email
    return googleData.profile.name || googleData.profile.email;
  },
  isAdmin: (data) => {
    const googleData = googleDataSchema.parse(data);
    if (!googleData.profile.email_verified) {
      return false;
    }
    return adminEmails.includes(googleData.profile.email);
  },
  // organizationId: (data) => {
  //   const googleData = googleDataSchema.parse(data);
  //   
  //   // Check if there's an invitation token in the query parameters
  //   const invitationToken = googleData.request?.query?.invitation;
  //   if (invitationToken) {
  //     try {
  //       const { organizationId, email } = verifyInvitationToken(invitationToken);
  //       // Verify the invitation is for this email
  //       if (email === googleData.profile.email) {
  //         return organizationId;
  //       }
  //     } catch (error) {
  //       console.error('Invalid invitation token during Google signup:', error);
  //       // Continue without organization assignment
  //     }
  //   }
  //   
  //   return null;
  // },
  role: (data) => {
    const googleData = googleDataSchema.parse(data);
    
    // Check if there's an invitation token in the query parameters
    const invitationToken = googleData.request?.query?.invitation;
    if (invitationToken) {
      try {
        const { role, email } = verifyInvitationToken(invitationToken);
        // Verify the invitation is for this email
        if (email === googleData.profile.email) {
          return role;
        }
      } catch (error) {
        console.error('Invalid invitation token during Google signup:', error);
        // Continue with default role
      }
    }
    
    // Default role for new users
    return 'LEARNER';
  },
});

export function getGoogleAuthConfig() {
  return {
    scopes: ['profile', 'email'], // must include at least 'profile' for Google
    additionalParams: {
      // Allow invitation token to be passed through the auth flow
      access_type: 'online',
      prompt: 'select_account',
    },
  };
}

const discordDataSchema = z.object({
  profile: z.object({
    username: z.string(),
    email: z.string().email().nullable(),
    verified: z.boolean().nullable(),
  }),
});

export const getDiscordUserFields = defineUserSignupFields({
  email: (data) => {
    const discordData = discordDataSchema.parse(data);
    // Users need to have an email for payment processing.
    if (!discordData.profile.email) {
      throw new Error('You need to have an email address associated with your Discord account to sign up.');
    }
    return discordData.profile.email;
  },
  username: (data) => {
    const discordData = discordDataSchema.parse(data);
    return discordData.profile.username;
  },
  isAdmin: (data) => {
    const discordData = discordDataSchema.parse(data);
    if (!discordData.profile.email || !discordData.profile.verified) {
      return false;
    }
    return adminEmails.includes(discordData.profile.email);
  },
});

export function getDiscordAuthConfig() {
  return {
    scopes: ['identify', 'email'],
  };
}

// Helper function to verify invitation tokens
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


