import { expect, type Page } from '@playwright/test';
import { randomUUID } from 'crypto';

export type User = {
  id?: number;
  email: string;
  password?: string;
};

const DEFAULT_PASSWORD = 'password123';

export const logUserIn = async ({ page, user }: { page: Page; user: User }) => {
  await page.goto('/');

  await page.getByRole('link', { name: 'Log in' }).click();
  await page.waitForURL('**/login', {
    waitUntil: 'domcontentloaded',
  });

  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', DEFAULT_PASSWORD);

  const clickLogin = page.click('button:has-text("Log in")');

  await Promise.all([
    page
      .waitForResponse((response) => {
        return response.url().includes('login') && response.status() === 200;
      })
      .catch((err) => console.error(err.message)),
    ,
    clickLogin,
  ]);

  await page.waitForURL('**/demo-app');
};

export const signUserUp = async ({ page, user }: { page: Page; user: User }) => {
  await page.goto('/');

  await page.evaluate(() => {
    try {
      const sessionId = localStorage.getItem('wasp:sessionId');
      if (sessionId) {
        localStorage.removeItem('wasp:sessionId');
      }
      window.location.reload();
    } catch (e) {
      console.error('Failed to clear localStorage:', e);
    }
  });

  await page.waitForLoadState('domcontentloaded');

  await page.getByRole('link', { name: 'Log in' }).click();

  await page.click('text="go to signup"');

  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', DEFAULT_PASSWORD);

  await page.click('button:has-text("Sign up")');

  await page
    .waitForResponse((response) => {
      return response.url().includes('signup') && response.status() === 200;
    })
    .catch((err) => console.error(err.message));
};

export const createRandomUser = () => {
  const email = `${randomUUID()}@test.com`;
  return { email, password: DEFAULT_PASSWORD } as User;
};

export const makeStripePayment = async ({
  test,
  page,
  planId,
}: {
  test: any;
  page: Page;
  planId: 'hobby' | 'pro' | 'credits10';
}) => {
  test.slow(); // Stripe payments take a long time to confirm and can cause tests to fail so we use a longer timeout

  await page.click('text="Pricing"');
  await page.waitForURL('**/pricing');

  const buyBtn = page.locator(`button[aria-describedby="${planId}"]`);

  await expect(buyBtn).toBeVisible();
  await expect(buyBtn).toBeEnabled();
  await buyBtn.click();

  await page.waitForURL('https://checkout.stripe.com/**', { waitUntil: 'domcontentloaded' });
  await page.fill('input[name="cardNumber"]', '4242424242424242');
  await page.getByPlaceholder('MM / YY').fill('1225');
  await page.getByPlaceholder('CVC').fill('123');
  await page.getByPlaceholder('Full name on card').fill('Test User');
  const countrySelect = page.getByLabel('Country or region');
  await countrySelect.selectOption('Germany');
  // This is a weird edge case where the `payBtn` assertion tests pass, but the button click still isn't registered.
  // That's why we wait for stripe responses below to finish loading before clicking the button.
  await page.waitForResponse(
    (response) => response.url().includes('trusted-types-checker') && response.status() === 200
  );
  const payBtn = page.getByTestId('hosted-payment-submit-button');
  await expect(payBtn).toBeVisible();
  await expect(payBtn).toBeEnabled();
  await payBtn.click();

  await page.waitForURL('**/checkout?success=true');
  await page.waitForURL('**/account');
  if (planId === 'credits10') {
    await expect(page.getByText('Credits remaining: 13')).toBeVisible();
  } else {
    await expect(page.getByText(planId)).toBeVisible();
  }
};

export const acceptAllCookies = async (page: Page) => {
  await page.waitForSelector('button:has-text("Accept all")');
  await page.click('button:has-text("Accept all")');
};

// PDF Learning SaaS specific utilities

export const makeUserAdmin = async ({ page, user }: { page: Page; user: User }) => {
  // In a real implementation, this would make an API call to update user role
  // For testing, we'll use a mock approach
  await page.evaluate(async (email) => {
    // This would typically be done via admin API
    console.log(`Making ${email} an admin user`);
    // Mock API call to update user role
    await fetch('/api/admin/make-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
  }, user.email);
};

export const createLearningModule = async ({ 
  page, 
  title, 
  description 
}: { 
  page: Page; 
  title: string; 
  description?: string; 
}) => {
  await page.goto('/pdf-upload');
  
  // Upload test PDF
  await page.setInputFiles('input[type="file"]', 'tests/fixtures/test-document.pdf');
  await page.fill('input[name="title"]', title);
  
  if (description) {
    await page.fill('textarea[name="description"]', description);
  }
  
  await page.click('button:has-text("Upload and Process")');
  
  // Wait for processing to complete
  await page.waitForSelector('text="Processing complete"', { timeout: 60000 });
  
  return title;
};

export const assignModuleToUser = async ({ 
  page, 
  moduleTitle, 
  userEmail, 
  dueDate 
}: { 
  page: Page; 
  moduleTitle: string; 
  userEmail: string; 
  dueDate?: string; 
}) => {
  await page.goto('/learning-modules');
  await page.click(`text="${moduleTitle}"`);
  await page.click('button:has-text("Assign Module")');
  
  await page.check(`input[value="${userEmail}"]`);
  
  if (dueDate) {
    await page.fill('input[name="dueDate"]', dueDate);
  }
  
  await page.click('button:has-text("Assign to Selected Members")');
  await page.waitForSelector('text="Module assigned successfully"');
};

export const completeModuleSection = async ({ 
  page, 
  sectionTitle 
}: { 
  page: Page; 
  sectionTitle?: string; 
}) => {
  if (sectionTitle) {
    await page.click(`text="${sectionTitle}"`);
  }
  
  // Mark section as complete
  await page.click('button:has-text("Mark as Complete")');
  await page.waitForSelector('text="Section completed!"');
};

export const waitForProcessingComplete = async (page: Page, timeout = 60000) => {
  await page.waitForSelector('text="Processing complete"', { timeout });
};

export const mockStripeWebhook = async (page: Page, eventType: string, data: any) => {
  // Mock Stripe webhook for testing subscription changes
  await page.evaluate(async ({ eventType, data }) => {
    await fetch('/payments-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': 'mock-signature'
      },
      body: JSON.stringify({
        type: eventType,
        data: { object: data }
      })
    });
  }, { eventType, data });
};

export const createOrganization = async ({ 
  page, 
  name, 
  tier = 'STARTER' 
}: { 
  page: Page; 
  name: string; 
  tier?: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'; 
}) => {
  await page.evaluate(async ({ name, tier }) => {
    // Mock organization creation
    await fetch('/api/organizations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, subscriptionTier: tier })
    });
  }, { name, tier });
};

export const inviteTeamMember = async ({ 
  page, 
  email, 
  role = 'LEARNER' 
}: { 
  page: Page; 
  email: string; 
  role?: 'ADMIN' | 'LEARNER'; 
}) => {
  await page.goto('/admin/team');
  await page.click('button:has-text("Invite Member")');
  await page.fill('input[name="email"]', email);
  await page.selectOption('select[name="role"]', role);
  await page.click('button:has-text("Send Invitation")');
  await page.waitForSelector('text="Invitation sent successfully"');
};

export const acceptTeamInvitation = async ({ 
  page, 
  token 
}: { 
  page: Page; 
  token: string; 
}) => {
  await page.goto(`/team/accept-invitation?token=${token}`);
  await page.click('button:has-text("Accept Invitation")');
  await page.waitForSelector('text="Welcome to the team!"');
};

// Enhanced Stripe payment function for PDF Learning SaaS plans
export const makePDFLearningPayment = async ({
  test,
  page,
  planId,
}: {
  test: any;
  page: Page;
  planId: 'starter' | 'professional' | 'enterprise';
}) => {
  test.slow(); // PDF Learning payments take time to confirm
  
  await page.click('text="Pricing"');
  await page.waitForURL('**/pricing');

  const buyBtn = page.locator(`button[aria-describedby="${planId}"]`);

  await expect(buyBtn).toBeVisible();
  await expect(buyBtn).toBeEnabled();
  await buyBtn.click();

  await page.waitForURL('https://checkout.stripe.com/**', { waitUntil: 'domcontentloaded' });
  await page.fill('input[name="cardNumber"]', '4242424242424242');
  await page.getByPlaceholder('MM / YY').fill('1225');
  await page.getByPlaceholder('CVC').fill('123');
  await page.getByPlaceholder('Full name on card').fill('Test User');
  
  const countrySelect = page.getByLabel('Country or region');
  await countrySelect.selectOption('Germany');
  
  await page.waitForResponse(
    (response) => response.url().includes('trusted-types-checker') && response.status() === 200
  );
  
  const payBtn = page.getByTestId('hosted-payment-submit-button');
  await expect(payBtn).toBeVisible();
  await expect(payBtn).toBeEnabled();
  await payBtn.click();

  await page.waitForURL('**/checkout?success=true');
  await page.waitForURL('**/account');
  
  // Verify plan-specific features
  if (planId === 'starter') {
    await expect(page.getByText('10 modules')).toBeVisible();
    await expect(page.getByText('25 team members')).toBeVisible();
  } else if (planId === 'professional') {
    await expect(page.getByText('Unlimited modules')).toBeVisible();
    await expect(page.getByText('100 team members')).toBeVisible();
  } else if (planId === 'enterprise') {
    await expect(page.getByText('Unlimited everything')).toBeVisible();
    await expect(page.getByText('API access')).toBeVisible();
  }
};
