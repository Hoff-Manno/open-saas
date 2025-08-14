import { expect, test, type Page } from '@playwright/test';
import { createRandomUser, logUserIn, signUserUp, type User } from './utils';

let page: Page;
let adminUser: User;
let learnerUser: User;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
  
  // Create users
  adminUser = createRandomUser();
  learnerUser = createRandomUser();
  
  await signUserUp({ page: page, user: adminUser });
  await signUserUp({ page: page, user: learnerUser });
});

test.afterAll(async () => {
  await page.close();
});

test.describe('Learning Progress Tracking', () => {
  test('Learner can start and progress through module', async () => {
    await logUserIn({ page: page, user: learnerUser });
    
    // Navigate to assigned module
    await page.goto('/learning-modules/viewer/test-module-id');
    
    // Verify module loads correctly
    await expect(page.getByText('Updated Test Learning Module')).toBeVisible();
    await expect(page.getByText('Progress: 0%')).toBeVisible();
    
    // Start learning
    await page.click('button:has-text("Start Learning")');
    
    // Verify first section loads
    await expect(page.getByText('Introduction Section')).toBeVisible();
    await expect(page.locator('[data-testid="section-content"]')).toBeVisible();
    
    // Mark section as complete
    await page.click('button:has-text("Mark as Complete")');
    
    // Verify progress updated
    await expect(page.getByText('Section completed!')).toBeVisible();
    await page.waitForSelector('text="Progress: 33%"'); // Assuming 3 sections
  });

  test('Progress is saved and can be resumed', async () => {
    // Continue from previous test - navigate to second section
    await page.click('button:has-text("Next Section")');
    
    // Scroll partway through content
    await page.locator('[data-testid="section-content"]').scrollIntoView();
    await page.mouse.wheel(0, 500);
    
    // Leave the page (simulating closing browser)
    await page.goto('/pdf-learning');
    
    // Return to module
    await page.goto('/learning-modules/viewer/test-module-id');
    
    // Verify resume functionality
    await expect(page.getByText('Resume where you left off')).toBeVisible();
    await page.click('button:has-text("Resume")');
    
    // Verify we're back at the correct position
    await expect(page.getByText('Section 2')).toBeVisible();
    // Verify scroll position was restored (this would need specific implementation)
  });

  test('Time spent tracking works correctly', async () => {
    // Start timing
    const startTime = Date.now();
    
    // Spend time reading content
    await page.waitForTimeout(5000); // Simulate 5 seconds of reading
    
    // Complete section
    await page.click('button:has-text("Mark as Complete")');
    
    // Navigate to progress dashboard
    await page.goto('/learning-modules/progress');
    
    // Verify time tracking
    await expect(page.getByText('Time Spent:')).toBeVisible();
    await expect(page.locator('[data-testid="time-spent"]')).toContainText('5 min'); // Rounded up
  });

  test('Bookmarking functionality works', async () => {
    // Navigate to a section
    await page.goto('/learning-modules/viewer/test-module-id');
    await page.click('button:has-text("Next Section")');
    
    // Add bookmark
    await page.click('button:has-text("Bookmark")');
    await page.fill('input[name="bookmarkNote"]', 'Important concept to review');
    await page.click('button:has-text("Save Bookmark")');
    
    // Verify bookmark was saved
    await expect(page.getByText('Bookmark saved')).toBeVisible();
    
    // Navigate to bookmarks page
    await page.goto('/learning-modules/bookmarks');
    
    // Verify bookmark appears in list
    await expect(page.getByText('Important concept to review')).toBeVisible();
    
    // Click bookmark to navigate back
    await page.click('text="Important concept to review"');
    
    // Verify we're back at the bookmarked location
    await expect(page.getByText('Section 2')).toBeVisible();
  });

  test('Search within module works correctly', async () => {
    await page.goto('/learning-modules/viewer/test-module-id');
    
    // Open search
    await page.click('button[data-testid="search-button"]');
    
    // Search for content
    await page.fill('input[name="searchQuery"]', 'introduction');
    await page.press('input[name="searchQuery"]', 'Enter');
    
    // Verify search results
    await expect(page.getByText('Search Results')).toBeVisible();
    await expect(page.locator('[data-testid="search-result"]')).toHaveCount({ min: 1 });
    
    // Click on search result
    await page.locator('[data-testid="search-result"]').first().click();
    
    // Verify navigation to search result location
    await expect(page.getByText('Introduction Section')).toBeVisible();
  });

  test('Module completion tracking works end-to-end', async () => {
    // Complete all remaining sections
    await page.goto('/learning-modules/viewer/test-module-id');
    
    // Get total number of sections
    const sectionCount = await page.locator('[data-testid="section-nav-item"]').count();
    
    // Complete each section
    for (let i = 0; i < sectionCount; i++) {
      await page.click('button:has-text("Mark as Complete")');
      
      if (i < sectionCount - 1) {
        await page.click('button:has-text("Next Section")');
      }
    }
    
    // Verify module completion
    await expect(page.getByText('Congratulations! Module completed!')).toBeVisible();
    await expect(page.getByText('Progress: 100%')).toBeVisible();
    
    // Verify completion certificate or badge
    await expect(page.getByText('Certificate of Completion')).toBeVisible();
    
    // Navigate to dashboard and verify completion
    await page.goto('/pdf-learning');
    await expect(page.getByText('Completed Modules: 1')).toBeVisible();
  });
});

test.describe('Admin Progress Monitoring', () => {
  test('Admin can view team progress overview', async () => {
    await logUserIn({ page: page, user: adminUser });
    
    // Navigate to admin progress dashboard
    await page.goto('/admin/learning/progress');
    
    // Verify progress overview
    await expect(page.getByText('Team Progress Overview')).toBeVisible();
    await expect(page.getByText('Total Learners:')).toBeVisible();
    await expect(page.getByText('Modules Completed:')).toBeVisible();
    await expect(page.getByText('Average Completion Rate:')).toBeVisible();
    
    // Verify individual learner progress
    await expect(page.locator(`tr:has-text("${learnerUser.email}")`)).toBeVisible();
    await expect(page.getByText('100%')).toBeVisible(); // From previous completion
  });

  test('Admin can view detailed progress analytics', async () => {
    await page.goto('/admin/learning/progress');
    
    // Click on detailed view for a learner
    await page.click(`tr:has-text("${learnerUser.email}") button:has-text("View Details")`);
    
    // Verify detailed progress information
    await expect(page.getByText('Learning Progress Details')).toBeVisible();
    await expect(page.getByText('Time Spent by Section')).toBeVisible();
    await expect(page.getByText('Completion Timeline')).toBeVisible();
    
    // Verify progress charts are displayed
    await expect(page.locator('[data-testid="progress-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="time-chart"]')).toBeVisible();
  });

  test('Admin can export progress reports', async () => {
    await page.goto('/admin/learning/progress');
    
    // Export team progress report
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Export Report")');
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toContain('team-progress-report');
    expect(download.suggestedFilename()).toContain('.csv');
    
    // Export individual learner report
    await page.click(`tr:has-text("${learnerUser.email}") button:has-text("Export")`);
    const individualDownload = await page.waitForEvent('download');
    
    expect(individualDownload.suggestedFilename()).toContain('learner-progress');
  });

  test('Admin receives completion notifications', async () => {
    // This would typically test email notifications
    // For now, we'll test in-app notifications
    
    await page.goto('/admin/dashboard');
    
    // Verify completion notification appears
    await expect(page.getByText('Recent Completions')).toBeVisible();
    await expect(page.locator(`text="${learnerUser.email} completed"`)).toBeVisible();
    await expect(page.getByText('Updated Test Learning Module')).toBeVisible();
  });
});