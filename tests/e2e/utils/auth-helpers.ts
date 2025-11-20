/**
 * Enhanced Authentication Helpers for E2E Tests
 *
 * Provides reusable authentication patterns, role-based testing utilities,
 * and session management for comprehensive E2E testing.
 */

import { Page, BrowserContext, test as base } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

/**
 * User roles for testing
 */
export type UserRole = 'admin' | 'analyst' | 'viewer' | 'operator';

/**
 * Auth state file paths
 */
export const AUTH_STATE_DIR = path.join(__dirname, '../.auth');

export const AUTH_STATE_FILES = {
  admin: path.join(AUTH_STATE_DIR, 'admin.json'),
  analyst: path.join(AUTH_STATE_DIR, 'analyst.json'),
  viewer: path.join(AUTH_STATE_DIR, 'viewer.json'),
  operator: path.join(AUTH_STATE_DIR, 'operator.json'),
} as const;

/**
 * Test user credentials
 */
export const TEST_USERS = {
  admin: {
    email: 'admin@test.intelgraph.ai',
    password: process.env.E2E_ADMIN_PASSWORD || 'test-password-admin',
    role: 'ADMIN' as const,
    permissions: ['read', 'write', 'delete', 'admin'],
  },
  analyst: {
    email: 'analyst@test.intelgraph.ai',
    password: process.env.E2E_ANALYST_PASSWORD || 'test-password-analyst',
    role: 'ANALYST' as const,
    permissions: ['read', 'write'],
  },
  viewer: {
    email: 'viewer@test.intelgraph.ai',
    password: process.env.E2E_VIEWER_PASSWORD || 'test-password-viewer',
    role: 'VIEWER' as const,
    permissions: ['read'],
  },
  operator: {
    email: 'operator@test.intelgraph.ai',
    password: process.env.E2E_OPERATOR_PASSWORD || 'test-password-operator',
    role: 'OPERATOR' as const,
    permissions: ['read', 'write', 'execute'],
  },
} as const;

/**
 * Creates auth state directory if it doesn't exist
 */
export function ensureAuthStateDir() {
  if (!fs.existsSync(AUTH_STATE_DIR)) {
    fs.mkdirSync(AUTH_STATE_DIR, { recursive: true });
  }
}

/**
 * Performs login flow for a specific role
 */
export async function loginAsRole(page: Page, role: UserRole) {
  const user = TEST_USERS[role];

  await page.goto('/login');

  // Wait for login page to load
  await page.waitForSelector('[data-testid="login-form"]', {
    state: 'visible',
    timeout: 10000,
  });

  // Fill credentials
  await page.fill('[data-testid="email-input"]', user.email);
  await page.fill('[data-testid="password-input"]', user.password);

  // Submit login form
  await page.click('[data-testid="login-button"]');

  // Wait for successful login redirect
  await page.waitForURL('**/dashboard', { timeout: 30000 });

  // Verify user is logged in
  await page.waitForSelector('[data-testid="user-menu-button"]', {
    state: 'visible',
  });
}

/**
 * Saves authentication state to file
 */
export async function saveAuthState(context: BrowserContext, role: UserRole) {
  ensureAuthStateDir();
  await context.storageState({ path: AUTH_STATE_FILES[role] });
}

/**
 * Loads authentication state from file
 */
export async function loadAuthState(
  context: BrowserContext,
  role: UserRole,
): Promise<boolean> {
  const authFile = AUTH_STATE_FILES[role];

  if (!fs.existsSync(authFile)) {
    return false;
  }

  try {
    const authState = JSON.parse(fs.readFileSync(authFile, 'utf-8'));

    // Apply cookies
    if (authState.cookies) {
      await context.addCookies(authState.cookies);
    }

    // Apply local storage
    if (authState.origins && authState.origins.length > 0) {
      const origin = authState.origins[0];
      if (origin.localStorage) {
        // Local storage needs to be set via page context
        const page = await context.newPage();
        await page.goto('/');

        for (const item of origin.localStorage) {
          await page.evaluate(
            ({ key, value }) => {
              localStorage.setItem(key, value);
            },
            { key: item.name, value: item.value },
          );
        }

        await page.close();
      }
    }

    return true;
  } catch (error) {
    console.error(`Failed to load auth state for ${role}:`, error);
    return false;
  }
}

/**
 * Verifies user is logged in with correct role
 */
export async function verifyLoggedInAs(page: Page, role: UserRole) {
  const user = TEST_USERS[role];

  // Open user menu
  await page.click('[data-testid="user-menu-button"]');

  // Verify email is displayed
  await page.waitForSelector('[data-testid="user-email"]');
  const emailText = await page
    .locator('[data-testid="user-email"]')
    .textContent();

  if (!emailText?.includes(user.email)) {
    throw new Error(
      `Expected user email ${user.email}, but got ${emailText}`,
    );
  }

  // Verify role is displayed
  const roleText = await page
    .locator('[data-testid="user-role"]')
    .textContent();

  if (!roleText?.includes(user.role)) {
    throw new Error(`Expected role ${user.role}, but got ${roleText}`);
  }

  // Close user menu
  await page.click('[data-testid="user-menu-button"]');
}

/**
 * Logs out current user
 */
export async function logout(page: Page) {
  await page.click('[data-testid="user-menu-button"]');
  await page.click('[data-testid="logout-button"]');
  await page.waitForURL('**/login', { timeout: 10000 });
}

/**
 * Clears all auth state files
 */
export function clearAllAuthStates() {
  if (fs.existsSync(AUTH_STATE_DIR)) {
    fs.readdirSync(AUTH_STATE_DIR).forEach((file) => {
      fs.unlinkSync(path.join(AUTH_STATE_DIR, file));
    });
  }
}

/**
 * Verifies access is denied for unauthorized role
 */
export async function verifyAccessDenied(page: Page) {
  await page.waitForSelector('[data-testid="access-denied"]', {
    state: 'visible',
    timeout: 5000,
  });

  const heading = await page.locator('h1').textContent();
  if (!heading?.includes('Access Denied')) {
    throw new Error(`Expected "Access Denied" but got "${heading}"`);
  }
}

/**
 * Tests that a route requires specific role
 */
export async function testRouteRequiresRole(
  page: Page,
  route: string,
  allowedRoles: UserRole[],
  deniedRoles: UserRole[],
) {
  // Test allowed roles
  for (const role of allowedRoles) {
    await loginAsRole(page, role);
    await page.goto(route);

    // Should NOT see access denied
    const accessDenied = page.locator('[data-testid="access-denied"]');
    const isVisible = await accessDenied.isVisible().catch(() => false);

    if (isVisible) {
      throw new Error(`Role ${role} should have access to ${route}`);
    }

    await logout(page);
  }

  // Test denied roles
  for (const role of deniedRoles) {
    await loginAsRole(page, role);
    await page.goto(route);

    // Should see access denied
    await verifyAccessDenied(page);

    await logout(page);
  }
}

/**
 * Gets JWT token from local storage
 */
export async function getAuthToken(page: Page): Promise<string | null> {
  return await page.evaluate(() => {
    return localStorage.getItem('authToken') || localStorage.getItem('token');
  });
}

/**
 * Sets JWT token in local storage
 */
export async function setAuthToken(page: Page, token: string) {
  await page.evaluate((t) => {
    localStorage.setItem('authToken', t);
    localStorage.setItem('token', t);
  }, token);
}

/**
 * Verifies token is valid and not expired
 */
export async function verifyTokenValid(page: Page): Promise<boolean> {
  const token = await getAuthToken(page);

  if (!token) {
    return false;
  }

  try {
    // Decode JWT to check expiration
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);

    return payload.exp > now;
  } catch (error) {
    console.error('Failed to verify token:', error);
    return false;
  }
}

/**
 * Waits for authentication to complete
 */
export async function waitForAuth(page: Page) {
  // Wait for either login or dashboard
  await Promise.race([
    page.waitForURL('**/login'),
    page.waitForURL('**/dashboard'),
    page.waitForSelector('[data-testid="user-menu-button"]'),
  ]);
}

/**
 * Extended Playwright test with authentication fixtures
 */
export const test = base.extend<{
  authenticatedPage: Page;
  adminPage: Page;
  analystPage: Page;
  viewerPage: Page;
}>({
  authenticatedPage: async ({ browser }, use, testInfo) => {
    // Default to analyst role
    const context = await browser.newContext({
      storageState: AUTH_STATE_FILES.analyst,
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: AUTH_STATE_FILES.admin,
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  analystPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: AUTH_STATE_FILES.analyst,
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  viewerPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: AUTH_STATE_FILES.viewer,
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

/**
 * Export expect from Playwright
 */
export { expect } from '@playwright/test';
