import { test, expect } from '../fixtures/base';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the initial user check to return 401 (not logged in)
    await page.route('**/users/me', async (route) => {
      await route.fulfill({ status: 401 });
    });

    // Mock login endpoint
    await page.route('**/auth/login', async (route) => {
      const postData = route.request().postDataJSON();
      if (postData.email === 'sarah.chen@intelgraph.com' && postData.password === 'password') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            token: 'fake-jwt-token',
            user: {
              id: 'user-123',
              email: 'sarah.chen@intelgraph.com',
              name: 'Sarah Chen',
              role: 'analyst'
            }
          })
        });
      } else {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Invalid credentials' })
        });
      }
    });
  });

  test('should login successfully with valid credentials', async ({ loginPage, page }) => {
    await loginPage.goto();

    // Mock /users/me to return user data for successful login state verification
    // This mocks the state AFTER login where the app might re-check the user
    await page.route('**/users/me', async (route) => {
       await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'user-123',
            email: 'sarah.chen@intelgraph.com',
            name: 'Sarah Chen',
            role: 'analyst'
          })
       });
    });

    await loginPage.login('sarah.chen@intelgraph.com', 'password');

    // Expect redirection to home/dashboard (root)
    await expect(page).toHaveURL('/');
  });

  test('should show error with invalid credentials', async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.login('wrong@example.com', 'wrongpassword');

    const errorMessage = await loginPage.getErrorMessageText();
    expect(errorMessage).toContain('Invalid credentials');
  });

  test('should require email and password', async ({ loginPage }) => {
     await loginPage.goto();
     await expect(loginPage.emailInput).toHaveAttribute('required', '');
     await expect(loginPage.passwordInput).toHaveAttribute('required', '');
  });
});
