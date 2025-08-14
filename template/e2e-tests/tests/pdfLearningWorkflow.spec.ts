import { expect, test, type Page } from '@playwright/test';
import { createRandomUser, logUserIn, signUserUp, type User } from './utils';
import path from 'path';

let page: Page;
let adminUser: User;
let learnerUser: User;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
  
  // Create admin user
  adminUser = createRandomUser();
  await signUserUp({ page: page, user: adminUser });
  
  // Make user admin by directly updating database (in real app, this would be done via admin interface)
  await page.evaluate(async (email) => {
    // This would typically be done via API call or database update
    console.log(`Making ${email} an admin user`);
  }, adminUser.email);
  
  // Create learner user
  learnerUser = createRandomUser();
  await signUserUp({ page: page, user: learnerUser });
});

test.afterAll(async () => {
  await page.close();
});

test.describe('PDF-to-Module Creation Workflow', () => {
  test('Admin can upload PDF and create learning module', async () => {
    test.slow(); // PDF processing can take time
    
    await logUserIn({ page: page, user: adminUser });
    
    // Navigate to PDF upload page
    await page.goto('/pdf-upload');
    await expect(page.getByText('Upload PDF Document')).toBeVisible();
    
    // Create a mock PDF file for testing
    const testPDFPath = path.join(__dirname, 'fixtures', 'test-document.pdf');
    
    // Upload PDF file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testPDFPath);
    
    // Fill in module details
    await page.fill('input[name="title"]', 'Test Learning Module');
    await page.fill('textarea[name="description"]', 'A test module created from PDF upload');
    
    // Submit upload
    await page.click('button:has-text("Upload and Process")');
    
    // Wait for processing to complete
    await page.waitForSelector('text="Processing complete"', { timeout: 60000 });
    
    // Verify module was created
    await page.goto('/learning-modules');
    await expect(page.getByText('Test Learning Module')).toBeVisible();
    
    // Click on the module to view details
    await page.click('text="Test Learning Module"');
    
    // Verify module sections were created
    await expect(page.getByText('Module Sections')).toBeVisible();
    await expect(page.locator('[data-testid="module-section"]')).toHaveCount({ min: 1 });
  });

  test('Admin can edit and customize learning module', async () => {
    // Navigate to module builder
    await page.goto('/learning-modules');
    await page.click('text="Test Learning Module"');
    await page.click('button:has-text("Edit Module")');
    
    // Edit module title and description
    await page.fill('input[name="title"]', 'Updated Test Learning Module');
    await page.fill('textarea[name="description"]', 'Updated description for the test module');
    
    // Edit a section
    const firstSection = page.locator('[data-testid="module-section"]').first();
    await firstSection.click();
    
    // Edit section content
    await page.fill('input[name="sectionTitle"]', 'Introduction Section');
    await page.fill('textarea[name="sectionContent"]', 'This is the updated introduction content.');
    
    // Save changes
    await page.click('button:has-text("Save Changes")');
    
    // Verify changes were saved
    await expect(page.getByText('Updated Test Learning Module')).toBeVisible();
    await expect(page.getByText('Introduction Section')).toBeVisible();
  });

  test('Module processing handles errors gracefully', async () => {
    // Navigate to PDF upload page
    await page.goto('/pdf-upload');
    
    // Try to upload an invalid file (non-PDF)
    const invalidFilePath = path.join(__dirname, 'fixtures', 'invalid-file.txt');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(invalidFilePath);
    
    await page.fill('input[name="title"]', 'Invalid File Test');
    await page.click('button:has-text("Upload and Process")');
    
    // Verify error message is displayed
    await expect(page.getByText('Please upload a valid PDF file')).toBeVisible();
    
    // Try uploading a corrupted PDF
    const corruptedPDFPath = path.join(__dirname, 'fixtures', 'corrupted.pdf');
    await fileInput.setInputFiles(corruptedPDFPath);
    await page.click('button:has-text("Upload and Process")');
    
    // Wait for processing to fail
    await page.waitForSelector('text="Processing failed"', { timeout: 30000 });
    
    // Verify retry option is available
    await expect(page.getByText('Retry Processing')).toBeVisible();
  });
});

test.describe('AI Service Integration', () => {
  test('AI question generation works correctly', async () => {
    test.slow(); // AI processing can take time
    
    // Navigate to existing module
    await page.goto('/learning-modules');
    await page.click('text="Updated Test Learning Module"');
    
    // Generate AI questions for a section
    await page.click('button:has-text("Generate Questions")');
    
    // Wait for AI processing
    await page.waitForResponse(response => 
      response.url().includes('generate-learning-questions') && response.status() === 200
    );
    
    // Verify questions were generated
    await expect(page.getByText('Generated Questions')).toBeVisible();
    await expect(page.locator('[data-testid="ai-question"]')).toHaveCount({ min: 1 });
  });

  test('AI service handles rate limiting', async () => {
    // Make multiple rapid requests to trigger rate limiting
    for (let i = 0; i < 5; i++) {
      await page.click('button:has-text("Generate Questions")');
    }
    
    // Verify rate limiting message
    await expect(page.getByText('Rate limit exceeded')).toBeVisible();
    
    // Verify retry after message
    await expect(page.getByText('Please try again in')).toBeVisible();
  });

  test('AI service handles API failures gracefully', async () => {
    // Mock API failure by intercepting requests
    await page.route('**/operations/generate-learning-questions', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'AI service temporarily unavailable' })
      });
    });
    
    await page.click('button:has-text("Generate Questions")');
    
    // Verify error handling
    await expect(page.getByText('AI service temporarily unavailable')).toBeVisible();
    await expect(page.getByText('Try again later')).toBeVisible();
  });
});