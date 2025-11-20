/**
 * Authentication Setup for E2E Tests
 * Creates authenticated user sessions for testing
 *
 * Uses enhanced auth helpers for consistent authentication across all tests.
 */

import { test as setup } from '@playwright/test';
import {
  loginAsRole,
  saveAuthState,
  ensureAuthStateDir,
  TEST_USERS,
} from '../../../tests/e2e/utils/auth-helpers';

// Ensure auth state directory exists before setup
ensureAuthStateDir();

setup('authenticate as admin', async ({ page, context }) => {
  console.log('Setting up admin authentication...');
  await loginAsRole(page, 'admin');
  await saveAuthState(context, 'admin');
  console.log(`✅ Admin authenticated as ${TEST_USERS.admin.email}`);
});

setup('authenticate as analyst', async ({ page, context }) => {
  console.log('Setting up analyst authentication...');
  await loginAsRole(page, 'analyst');
  await saveAuthState(context, 'analyst');
  console.log(`✅ Analyst authenticated as ${TEST_USERS.analyst.email}`);
});

setup('authenticate as viewer', async ({ page, context }) => {
  console.log('Setting up viewer authentication...');
  await loginAsRole(page, 'viewer');
  await saveAuthState(context, 'viewer');
  console.log(`✅ Viewer authenticated as ${TEST_USERS.viewer.email}`);
});

setup('authenticate as operator', async ({ page, context }) => {
  console.log('Setting up operator authentication...');
  await loginAsRole(page, 'operator');
  await saveAuthState(context, 'operator');
  console.log(`✅ Operator authenticated as ${TEST_USERS.operator.email}`);
});
