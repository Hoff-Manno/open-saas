import { expect, test, type Page } from '@playwright/test';
import { createRandomUser, logUserIn, signUserUp, type User } from './utils';

let page: Page;
let adminUser: User;
let learnerUser1: User;
let learnerUser2: User;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
  
  // Create admin user
  adminUser = createRandomUser();
  await signUserUp({ page: page, user: adminUser });
  
  // Create learner users
  learnerUser1 = createRandomUser();
  learnerUser2 = createRandomUser();
});

test.afterAll(async () => {
  await page.close();
});

test.describe('Team Management and Permissions', () => {
  test('Admin can invite team members', async () => {
    await logUserIn({ page: page, user: adminUser });
    
    // Navigate to team management
    await page.goto('/admin/team');
    await expect(page.getByText('Team Management')).toBeVisible();
    
    // Invite first learner
    await page.click('button:has-text("Invite Member")');
    await page.fill('input[name="email"]', learnerUser1.email);
    await page.selectOption('select[name="role"]', 'LEARNER');
    await page.click('button:has-text("Send Invitation")');
    
    // Verify invitation was sent
    await expect(page.getByText('Invitation sent successfully')).toBeVisible();
    await expect(page.getByText(learnerUser1.email)).toBeVisible();
    
    // Invite second learner
    await page.click('button:has-text("Invite Member")');
    await page.fill('input[name="email"]', learnerUser2.email);
    await page.selectOption('select[name="role"]', 'LEARNER');
    await page.click('button:has-text("Send Invitation")');
    
    await expect(page.getByText(learnerUser2.email)).toBeVisible();
  });

  test('Learner can accept team invitation', async () => {
    // Sign up learner user
    await signUserUp({ page: page, user: learnerUser1 });
    
    // Navigate to invitation acceptance page (would typically come from email link)
    await page.goto('/team/accept-invitation?token=mock-invitation-token');
    
    // Accept invitation
    await page.click('button:has-text("Accept Invitation")');
    
    // Verify user is now part of team
    await expect(page.getByText('Welcome to the team!')).toBeVisible();
    
    // Verify user has learner role
    await page.goto('/account');
    await expect(page.getByText('Role: Learner')).toBeVisible();
  });

  test('Admin can manage team member roles', async () => {
    await logUserIn({ page: page, user: adminUser });
    await page.goto('/admin/team');
    
    // Find learner user in team list
    const userRow = page.locator(`tr:has-text("${learnerUser1.email}")`);
    await expect(userRow).toBeVisible();
    
    // Change role to admin
    await userRow.locator('select[name="role"]').selectOption('ADMIN');
    await userRow.locator('button:has-text("Update")').click();
    
    // Verify role was updated
    await expect(page.getByText('Role updated successfully')).toBeVisible();
    
    // Change back to learner
    await userRow.locator('select[name="role"]').selectOption('LEARNER');
    await userRow.locator('button:has-text("Update")').click();
    
    await expect(page.getByText('Role updated successfully')).toBeVisible();
  });

  test('Admin can remove team members', async () => {
    await page.goto('/admin/team');
    
    // Find learner user in team list
    const userRow = page.locator(`tr:has-text("${learnerUser2.email}")`);
    await userRow.locator('button:has-text("Remove")').click();
    
    // Confirm removal
    await page.click('button:has-text("Confirm Removal")');
    
    // Verify user was removed
    await expect(page.getByText('Team member removed successfully')).toBeVisible();
    await expect(page.locator(`tr:has-text("${learnerUser2.email}")`)).not.toBeVisible();
  });

  test('Learner permissions are properly enforced', async () => {
    await logUserIn({ page: page, user: learnerUser1 });
    
    // Try to access admin-only pages
    await page.goto('/admin/team');
    await expect(page.getByText('Access denied')).toBeVisible();
    
    await page.goto('/admin/dashboard');
    await expect(page.getByText('Access denied')).toBeVisible();
    
    // Verify learner can access allowed pages
    await page.goto('/learning-modules');
    await expect(page.getByText('My Learning Modules')).toBeVisible();
    
    await page.goto('/pdf-learning');
    await expect(page.getByText('Learning Dashboard')).toBeVisible();
  });

  test('Admin permissions allow full access', async () => {
    await logUserIn({ page: page, user: adminUser });
    
    // Verify admin can access all pages
    await page.goto('/admin/team');
    await expect(page.getByText('Team Management')).toBeVisible();
    
    await page.goto('/admin/dashboard');
    await expect(page.getByText('Admin Dashboard')).toBeVisible();
    
    await page.goto('/learning-modules');
    await expect(page.getByText('Learning Modules')).toBeVisible();
    
    await page.goto('/pdf-learning');
    await expect(page.getByText('Learning Dashboard')).toBeVisible();
  });
});

test.describe('Module Assignment Workflow', () => {
  test('Admin can assign modules to team members', async () => {
    await logUserIn({ page: page, user: adminUser });
    
    // Navigate to module management
    await page.goto('/learning-modules');
    
    // Select a module to assign
    await page.click('text="Updated Test Learning Module"');
    await page.click('button:has-text("Assign Module")');
    
    // Select team members to assign to
    await page.check(`input[value="${learnerUser1.email}"]`);
    
    // Set due date
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    await page.fill('input[name="dueDate"]', futureDate.toISOString().split('T')[0]);
    
    // Assign module
    await page.click('button:has-text("Assign to Selected Members")');
    
    // Verify assignment was created
    await expect(page.getByText('Module assigned successfully')).toBeVisible();
  });

  test('Learner receives assignment notification', async () => {
    await logUserIn({ page: page, user: learnerUser1 });
    
    // Check for assignment notification
    await page.goto('/pdf-learning');
    await expect(page.getByText('New Assignment')).toBeVisible();
    await expect(page.getByText('Updated Test Learning Module')).toBeVisible();
    
    // View assignment details
    await page.click('text="Updated Test Learning Module"');
    await expect(page.getByText('Due Date:')).toBeVisible();
    await expect(page.getByText('Progress: 0%')).toBeVisible();
  });

  test('Assignment notifications are sent via email', async () => {
    // This would typically check email delivery in a real system
    // For testing, we can verify the email sending operation was called
    await logUserIn({ page: page, user: adminUser });
    
    // Monitor network requests for email sending
    let emailSent = false;
    page.on('response', response => {
      if (response.url().includes('send-assignment-email')) {
        emailSent = true;
      }
    });
    
    // Create new assignment
    await page.goto('/learning-modules');
    await page.click('text="Updated Test Learning Module"');
    await page.click('button:has-text("Assign Module")');
    await page.check(`input[value="${learnerUser1.email}"]`);
    await page.click('button:has-text("Assign to Selected Members")');
    
    // Verify email sending was triggered
    await page.waitForTimeout(2000); // Wait for async email sending
    expect(emailSent).toBe(true);
  });
});