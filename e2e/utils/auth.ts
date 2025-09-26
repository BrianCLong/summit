import { expect, type Page } from '@playwright/test';

export interface Credentials {
  email?: string;
  password?: string;
}

const DEFAULT_CREDENTIALS: Required<Credentials> = {
  email: 'analyst@example.com',
  password: 'SuperSecure!123',
};

export async function performLogin(page: Page, credentials: Credentials = {}): Promise<void> {
  const { email, password } = { ...DEFAULT_CREDENTIALS, ...credentials };

  await page.goto('/login');
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole('heading', { name: /Stats Overview/i })).toBeVisible();
}
