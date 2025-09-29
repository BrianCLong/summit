/**
 * Authentication Setup for E2E Tests
 * Creates authenticated user sessions for testing
 */

import { test as setup, expect } from '@playwright/test';

const adminFile = 'tests/e2e/.auth/admin.json';
const analystFile = 'tests/e2e/.auth/analyst.json';
const viewerFile = 'tests/e2e/.auth/viewer.json';

setup('authenticate as admin', async ({ page }) => {
  await page.goto('/login');
  
  // Perform authentication steps
  await page.fill('[data-testid="email-input"]', 'admin@test.com');
  await page.fill('[data-testid="password-input"]', 'testpassword');
  await page.click('[data-testid="login-button"]');
  
  // Wait for successful login
  await expect(page).toHaveURL('/dashboard');
  
  // Save authentication state
  await page.context().storageState({ path: adminFile });
});

setup('authenticate as analyst', async ({ page }) => {
  await page.goto('/login');
  
  await page.fill('[data-testid="email-input"]', 'analyst@test.com');
  await page.fill('[data-testid="password-input"]', 'testpassword');
  await page.click('[data-testid="login-button"]');
  
  await expect(page).toHaveURL('/dashboard');
  
  await page.context().storageState({ path: analystFile });
});

setup('authenticate as viewer', async ({ page }) => {
  await page.goto('/login');
  
  await page.fill('[data-testid="email-input"]', 'viewer@test.com');
  await page.fill('[data-testid="password-input"]', 'testpassword');
  await page.click('[data-testid="login-button"]');
  
  await expect(page).toHaveURL('/dashboard');
  
  await page.context().storageState({ path: viewerFile });
});