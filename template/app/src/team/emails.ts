// Email content interface
interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

export function getTeamInvitationEmailContent(data: {
  organizationName: string;
  inviterName: string;
  role: string;
  invitationLink: string;
}): EmailContent {
  const { organizationName, inviterName, role, invitationLink } = data;

  return {
    subject: `You're invited to join ${organizationName}`,
    text: `Hello!

${inviterName} has invited you to join ${organizationName} as a ${role.toLowerCase()}.

You'll have access to learning modules and can collaborate with your team members.

Click the link below to accept your invitation:
${invitationLink}

This invitation will expire in 7 days.

Best regards,
${organizationName} Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1f2937; margin: 0; font-size: 24px;">You're Invited!</h1>
          </div>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
            <h2 style="color: #374151; margin: 0 0 15px 0; font-size: 18px;">Join ${organizationName}</h2>
            <p style="color: #6b7280; margin: 5px 0; font-size: 14px;">
              <strong>Invited by:</strong> ${inviterName}
            </p>
            <p style="color: #6b7280; margin: 5px 0; font-size: 14px;">
              <strong>Role:</strong> ${role}
            </p>
          </div>

          <p style="color: #374151; line-height: 1.6; margin-bottom: 25px;">
            You've been invited to join <strong>${organizationName}</strong> as a <strong>${role.toLowerCase()}</strong>. 
            You'll have access to learning modules and can collaborate with your team members.
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${invitationLink}" 
               style="background-color: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">
              Accept Invitation
            </a>
          </div>

          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              This invitation will expire in 7 days. If you're having trouble with the button above, copy and paste this URL into your browser:
            </p>
            <p style="color: #9ca3af; font-size: 12px; word-break: break-all; margin: 5px 0 0 0;">
              ${invitationLink}
            </p>
          </div>
        </div>
      </div>
    `,
  };
}

export function getModuleAssignmentEmailContent(data: {
  userEmail: string;
  username?: string;
  moduleTitle: string;
  organizationName: string;
  dueDate?: Date;
  moduleLink: string;
}): EmailContent {
  const { userEmail, username, moduleTitle, organizationName, dueDate, moduleLink } = data;
  const displayName = username || userEmail;
  const dueDateText = dueDate ? dueDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : null;

  return {
    subject: `New Learning Module Assigned: ${moduleTitle}`,
    text: `Hello ${displayName}!

A new learning module has been assigned to you:

Module: ${moduleTitle}
Organization: ${organizationName}
${dueDateText ? `Due Date: ${dueDateText}` : ''}

Click the link below to start learning:
${moduleLink}

Happy learning!
${organizationName} Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1f2937; margin: 0; font-size: 24px;">📚 New Learning Module</h1>
          </div>
          
          <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">
            Hello ${displayName}!
          </p>

          <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin-bottom: 25px;">
            <h2 style="color: #1d4ed8; margin: 0 0 10px 0; font-size: 18px;">${moduleTitle}</h2>
            <p style="color: #1e40af; margin: 5px 0; font-size: 14px;">
              <strong>Organization:</strong> ${organizationName}
            </p>
            ${dueDateText ? `
              <p style="color: #dc2626; margin: 5px 0; font-size: 14px;">
                <strong>Due Date:</strong> ${dueDateText}
              </p>
            ` : ''}
          </div>

          <p style="color: #374151; line-height: 1.6; margin-bottom: 25px;">
            A new learning module has been assigned to you. Click the button below to start your learning journey!
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${moduleLink}" 
               style="background-color: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">
              Start Learning
            </a>
          </div>

          ${dueDateText ? `
            <div style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                ⏰ <strong>Reminder:</strong> This module is due on ${dueDateText}. Plan your time accordingly!
              </p>
            </div>
          ` : ''}

          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              Having trouble with the button above? Copy and paste this URL into your browser:
            </p>
            <p style="color: #9ca3af; font-size: 12px; word-break: break-all; margin: 5px 0 0 0;">
              ${moduleLink}
            </p>
          </div>
        </div>
      </div>
    `,
  };
}

export function getTeamWelcomeEmailContent(data: {
  userEmail: string;
  username?: string;
  organizationName: string;
  role: string;
  dashboardLink: string;
}): EmailContent {
  const { userEmail, username, organizationName, role, dashboardLink } = data;
  const displayName = username || userEmail;

  return {
    subject: `Welcome to ${organizationName}!`,
    text: `Welcome ${displayName}!

You've successfully joined ${organizationName} as a ${role.toLowerCase()}.

Here's what you can do next:
- Explore your dashboard
- Browse available learning modules
- Connect with your team members
- Track your learning progress

Click here to get started:
${dashboardLink}

Welcome aboard!
${organizationName} Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1f2937; margin: 0; font-size: 28px;">🎉 Welcome!</h1>
          </div>
          
          <p style="color: #374151; font-size: 18px; margin-bottom: 20px; text-align: center;">
            Hello ${displayName}!
          </p>

          <div style="background-color: #f0f9ff; border: 2px solid #0ea5e9; padding: 25px; border-radius: 8px; margin-bottom: 30px; text-align: center;">
            <h2 style="color: #0c4a6e; margin: 0 0 15px 0; font-size: 20px;">
              You've joined ${organizationName}
            </h2>
            <p style="color: #075985; margin: 0; font-size: 16px;">
              Role: <strong>${role}</strong>
            </p>
          </div>

          <div style="margin-bottom: 30px;">
            <h3 style="color: #374151; font-size: 18px; margin-bottom: 15px;">What's next?</h3>
            <ul style="color: #6b7280; line-height: 1.8;">
              <li>🏠 <strong>Explore your dashboard</strong> - Get familiar with your workspace</li>
              <li>📚 <strong>Browse learning modules</strong> - Discover available content</li>
              <li>👥 <strong>Connect with team members</strong> - Collaborate and learn together</li>
              <li>📊 <strong>Track your progress</strong> - Monitor your learning journey</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardLink}" 
               style="background-color: #6366f1; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 18px;">
              Get Started
            </a>
          </div>

          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center;">
            <p style="color: #9ca3af; font-size: 14px; margin: 0;">
              Welcome to the team! We're excited to have you on board. 🚀
            </p>
          </div>
        </div>
      </div>
    `,
  };
}
