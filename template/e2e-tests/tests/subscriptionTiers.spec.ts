import { expect, test, type Page } from '@playwright/test';
import { createRandomUser, logUserIn, signUserUp, makePDFLearningPayment, type User } from './utils';

let page: Page;
let starterUser: User;
let proUser: User;
let enterpriseUser: User;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
  
  // Create users for different subscription tiers
  starterUser = createRandomUser();
  proUser = createRandomUser();
  enterpriseUser = createRandomUser();
  
  await signUserUp({ page: page, user: starterUser });
  await signUserUp({ page: page, user: proUser });
  await signUserUp({ page: page, user: enterpriseUser });
});

test.afterAll(async () => {
  await page.close();
});

test.describe('Subscription Tier Enforcement', () => {
  test('Free tier has proper limitations', async () => {
    await logUserIn({ page: page, user: starterUser });
    
    // Navigate to PDF upload
    await page.goto('/pdf-upload');
    
    // Verify free tier limitations are displayed
    await expect(page.getByText('Free Plan Limits')).toBeVisible();
    await expect(page.getByText('3 modules remaining')).toBeVisible();
    await expect(page.getByText('5 team members max')).toBeVisible();
    
    // Try to upload multiple PDFs to reach limit
    for (let i = 0; i < 4; i++) {
      await page.goto('/pdf-upload');
      
      if (i < 3) {
        // Should succeed for first 3 uploads
        await page.setInputFiles('input[type="file"]', 'tests/fixtures/test-document.pdf');
        await page.fill('input[name="title"]', `Test Module ${i + 1}`);
        await page.click('button:has-text("Upload and Process")');
        
        await expect(page.getByText('Upload successful')).toBeVisible();
      } else {
        // Should fail on 4th upload
        await page.setInputFiles('input[type="file"]', 'tests/fixtures/test-document.pdf');
        await page.fill('input[name="title"]', 'Test Module 4');
        await page.click('button:has-text("Upload and Process")');
        
        await expect(page.getByText('Module limit reached')).toBeVisible();
        await expect(page.getByText('Upgrade to create more modules')).toBeVisible();
      }
    }
  });

  test('Starter plan subscription and limits', async () => {
    // Upgrade to Starter plan
    await makePDFLearningPayment({ test, page, planId: 'starter' });
    
    // Verify plan upgrade
    await page.goto('/account');
    await expect(page.getByText('Plan: Starter')).toBeVisible();
    await expect(page.getByText('10 modules')).toBeVisible();
    await expect(page.getByText('25 team members')).toBeVisible();
    
    // Test increased limits
    await page.goto('/pdf-upload');
    await expect(page.getByText('7 modules remaining')).toBeVisible(); // 10 - 3 already created
    
    // Test team member limit
    await page.goto('/admin/team');
    
    // Try to invite 26 members (should fail)
    for (let i = 0; i < 26; i++) {
      await page.click('button:has-text("Invite Member")');
      await page.fill('input[name="email"]', `user${i}@test.com`);
      
      if (i < 25) {
        await page.click('button:has-text("Send Invitation")');
        await expect(page.getByText('Invitation sent')).toBeVisible();
      } else {
        await page.click('button:has-text("Send Invitation")');
        await expect(page.getByText('Team member limit reached')).toBeVisible();
        break;
      }
    }
  });

  test('Professional plan has higher limits', async () => {
    await logUserIn({ page: page, user: proUser });
    
    // Upgrade to Professional plan
    await makePDFLearningPayment({ test, page, planId: 'professional' });
    
    // Verify plan features
    await page.goto('/account');
    await expect(page.getByText('Plan: Professional')).toBeVisible();
    await expect(page.getByText('Unlimited modules')).toBeVisible();
    await expect(page.getByText('100 team members')).toBeVisible();
    await expect(page.getByText('Advanced analytics')).toBeVisible();
    
    // Test unlimited modules
    await page.goto('/pdf-upload');
    await expect(page.getByText('Unlimited modules')).toBeVisible();
    
    // Test advanced analytics access
    await page.goto('/admin/analytics');
    await expect(page.getByText('Advanced Learning Analytics')).toBeVisible();
    await expect(page.getByText('Engagement Heatmaps')).toBeVisible();
    await expect(page.getByText('Learning Path Analysis')).toBeVisible();
  });

  test('Enterprise plan has all features', async () => {
    await logUserIn({ page: page, user: enterpriseUser });
    
    // Upgrade to Enterprise plan
    await makePDFLearningPayment({ test, page, planId: 'enterprise' });
    
    // Verify enterprise features
    await page.goto('/account');
    await expect(page.getByText('Plan: Enterprise')).toBeVisible();
    await expect(page.getByText('Unlimited everything')).toBeVisible();
    await expect(page.getByText('API access')).toBeVisible();
    await expect(page.getByText('Priority support')).toBeVisible();
    
    // Test API access
    await page.goto('/admin/api');
    await expect(page.getByText('API Management')).toBeVisible();
    await expect(page.getByText('Generate API Key')).toBeVisible();
    
    // Generate API key
    await page.click('button:has-text("Generate API Key")');
    await expect(page.getByText('API key generated')).toBeVisible();
    await expect(page.locator('[data-testid="api-key"]')).toBeVisible();
    
    // Test white-label options
    await page.goto('/admin/branding');
    await expect(page.getByText('Custom Branding')).toBeVisible();
    await expect(page.getByText('Upload Logo')).toBeVisible();
    await expect(page.getByText('Custom Domain')).toBeVisible();
  });

  test('Subscription downgrade handles limits correctly', async () => {
    await logUserIn({ page: page, user: proUser });
    
    // Create more modules than starter plan allows
    for (let i = 0; i < 15; i++) {
      await page.goto('/pdf-upload');
      await page.setInputFiles('input[type="file"]', 'tests/fixtures/test-document.pdf');
      await page.fill('input[name="title"]', `Pro Module ${i + 1}`);
      await page.click('button:has-text("Upload and Process")');
    }
    
    // Downgrade to Starter plan
    await page.goto('/account');
    await page.click('button:has-text("Change Plan")');
    await page.click('button:has-text("Downgrade to Starter")');
    
    // Confirm downgrade
    await page.click('button:has-text("Confirm Downgrade")');
    
    // Verify downgrade warning
    await expect(page.getByText('You have more modules than allowed')).toBeVisible();
    await expect(page.getByText('Some features will be limited')).toBeVisible();
    
    // Verify existing modules are read-only
    await page.goto('/learning-modules');
    const moduleCount = await page.locator('[data-testid="module-card"]').count();
    expect(moduleCount).toBeGreaterThan(10);
    
    // Verify modules beyond limit are marked as read-only
    const readOnlyModules = await page.locator('[data-testid="read-only-module"]').count();
    expect(readOnlyModules).toBeGreaterThan(0);
    
    // Verify cannot create new modules
    await page.goto('/pdf-upload');
    await expect(page.getByText('Module limit exceeded')).toBeVisible();
    await expect(page.getByText('Upgrade to create more')).toBeVisible();
  });
});

test.describe('Billing Integration', () => {
  test('Payment failure handling', async () => {
    await logUserIn({ page: page, user: starterUser });
    
    // Try to upgrade with invalid payment method
    await page.goto('/pricing');
    await page.click('button[aria-describedby="professional"]');
    
    // Fill in invalid card details
    await page.waitForURL('https://checkout.stripe.com/**');
    await page.fill('input[name="cardNumber"]', '4000000000000002'); // Declined card
    await page.fill('input[name="expiry"]', '1225');
    await page.fill('input[name="cvc"]', '123');
    await page.fill('input[name="billingName"]', 'Test User');
    
    await page.click('button[data-testid="hosted-payment-submit-button"]');
    
    // Verify payment failure handling
    await expect(page.getByText('Your card was declined')).toBeVisible();
    
    // Verify user remains on current plan
    await page.goto('/account');
    await expect(page.getByText('Plan: Starter')).toBeVisible();
  });

  test('Subscription cancellation', async () => {
    await logUserIn({ page: page, user: proUser });
    
    // Cancel subscription
    await page.goto('/account');
    await page.click('button:has-text("Manage Subscription")');
    
    // This would redirect to Stripe customer portal
    await page.waitForURL('https://billing.stripe.com/**');
    
    // In a real test, we'd interact with Stripe's portal
    // For this test, we'll mock the cancellation
    await page.goto('/account?cancelled=true');
    
    // Verify cancellation status
    await expect(page.getByText('Subscription cancelled')).toBeVisible();
    await expect(page.getByText('Access until period end')).toBeVisible();
    
    // Verify features still work until period end
    await page.goto('/pdf-upload');
    await expect(page.getByText('Upload PDF')).toBeVisible();
    
    // Mock period end
    await page.goto('/account?period_ended=true');
    
    // Verify downgrade to free tier
    await expect(page.getByText('Plan: Free')).toBeVisible();
    
    // Verify limited access
    await page.goto('/pdf-upload');
    await expect(page.getByText('Upgrade to upload more')).toBeVisible();
  });

  test('Webhook handling for subscription updates', async () => {
    // This test would verify that webhook events properly update user subscriptions
    // In a real implementation, this would involve:
    // 1. Triggering webhook events from Stripe
    // 2. Verifying database updates
    // 3. Checking user access changes
    
    // For now, we'll test the UI response to subscription changes
    await logUserIn({ page: page, user: starterUser });
    
    // Simulate webhook updating subscription status
    await page.evaluate(() => {
      // This would typically be done via API call
      localStorage.setItem('subscription_updated', 'true');
    });
    
    await page.reload();
    
    // Verify subscription update notification
    await expect(page.getByText('Subscription updated')).toBeVisible();
  });

  test('Usage-based billing tracking', async () => {
    await logUserIn({ page: page, user: enterpriseUser });
    
    // Navigate to usage dashboard
    await page.goto('/account/usage');
    
    // Verify usage metrics are displayed
    await expect(page.getByText('Current Usage')).toBeVisible();
    await expect(page.getByText('Modules Created:')).toBeVisible();
    await expect(page.getByText('Team Members:')).toBeVisible();
    await expect(page.getByText('Storage Used:')).toBeVisible();
    await expect(page.getByText('API Calls:')).toBeVisible();
    
    // Verify usage charts
    await expect(page.locator('[data-testid="usage-chart"]')).toBeVisible();
    
    // Test usage alerts
    await page.goto('/account/billing-alerts');
    await page.fill('input[name="usageThreshold"]', '80');
    await page.click('button:has-text("Set Alert")');
    
    await expect(page.getByText('Usage alert set')).toBeVisible();
  });
});