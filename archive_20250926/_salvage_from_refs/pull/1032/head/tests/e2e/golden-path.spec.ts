import { test, expect } from '@playwright/test';

// Minimal golden path smoke test
// Navigates through core flows and ensures responses appear

test('user can complete golden path', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByLabel('Email').fill('demo@intelgraph.local');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Submit' }).click();

  await page.getByRole('button', { name: 'New Investigation' }).click();
  await page.getByLabel('Title').fill('E2E Investigation');
  await page.getByRole('button', { name: 'Create' }).click();

  await page.getByRole('button', { name: 'Add Entity' }).click();
  await page.getByLabel('Name').fill('Entity A');
  await page.getByRole('button', { name: 'Save' }).click();

  await page.getByRole('button', { name: 'Add Relationship' }).click();
  await page.getByRole('combobox', { name: 'Source' }).selectOption({ index: 0 });
  await page.getByRole('combobox', { name: 'Target' }).selectOption({ index: 0 });
  await page.getByRole('button', { name: 'Create Relationship' }).click();

  await page.getByRole('button', { name: 'Copilot' }).click();
  await expect(page.getByText('Streaming')).toBeVisible();
});
