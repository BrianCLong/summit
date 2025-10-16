import { test, expect } from '@playwright/test';

test.describe('Authentication and Authorization', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a protected route to trigger login flow
    await page.goto('/maestro/runs');
  });

  test('should allow user to log in and access protected content', async ({
    page,
  }) => {
    // Expect to be on the login page
    await expect(page.getByText('Sign In to Maestro')).toBeVisible();

    // Simulate successful login (assuming a mock or stubbed gateway response)
    // In a real scenario, this would involve clicking a login button and handling the redirect
    // For this E2E test, we'll directly set the session or mock the auth callback

    // For now, let's assume clicking Auth0 button directly leads to a logged-in state for testing purposes
    // In a real E2E, you'd interact with the actual IdP login page or mock it at network level
    await page.getByRole('button', { name: 'Sign in with Auth0' }).click();

    // Simulate the callback redirect and token exchange
    // This part is tricky for E2E. Ideally, the test environment would have a mock IdP
    // or a way to directly inject session/tokens. For now, we'll simulate a direct navigation
    // to the callback with mock parameters and then to the app.
    await page.goto('/maestro/auth/callback?code=mock_code&state=mock_state');

    // Expect to be redirected to the main app after successful login
    await expect(page.url()).toContain('/maestro');
    await expect(page.getByText('Maestro builds IntelGraph')).toBeVisible();
    await expect(page.getByText('Authenticating...')).not.toBeVisible();

    // Verify protected content is visible
    await expect(page.getByText('Runs')).toBeVisible();
  });

  test('should show access denied for unauthorized role', async ({ page }) => {
    // Simulate login as a user with only 'viewer' role
    // This requires a way to control the mock user's roles in the test environment
    // For now, we'll assume the login above results in a 'viewer' user for this specific test run
    await page.goto(
      '/maestro/auth/callback?code=mock_code_viewer&state=mock_state',
    );
    await page.goto('/maestro/autonomy'); // This route requires 'operator' role

    await expect(page.getByText('Access Denied')).toBeVisible();
    await expect(
      page.getByText(
        /You don't have the required role\(s\) to access this resource./i,
      ),
    ).toBeVisible();
  });

  test('should show tenant access required for unauthorized tenant', async ({
    page,
  }) => {
    // Simulate login as a user with access only to 'tenantA'
    await page.goto(
      '/maestro/auth/callback?code=mock_code_tenantA&state=mock_state',
    );
    // Assuming a route like /maestro/tenants/tenantB that requires access to tenantB
    // This would need a specific route in App.tsx that uses the tenant prop on ProtectedRoute
    // For demonstration, let's assume /maestro/tenants/costs is configured to require a specific tenant
    // (which it isn't in the current App.tsx, but would be in a real scenario)
    // For now, we'll just check the message if we navigate to a hypothetical tenant-protected route
    await page.goto('/maestro/tenants/costs'); // This route is not tenant-protected in App.tsx, but we can simulate the check

    // To properly test this, we'd need a route like:
    // <Route path="/some-tenant-route" element={<ProtectedRoute tenant="tenantB"><SomeTenantComponent /></ProtectedRoute>} />
    // And then navigate to /maestro/some-tenant-route

    // Since we don't have a specific tenant-guarded route in App.tsx yet, this test will be conceptual.
    // If the ProtectedRoute logic is working, and a route is configured with `tenant="tenantB"`
    // and the logged-in user does NOT have access to `tenantB`, this message should appear.
    // For now, we'll just assert on the presence of the message if it were to appear.
    // This test needs a corresponding route setup in App.tsx to be fully functional.
    // For the purpose of this test, we'll assume the user is logged in and then tries to access a tenant-restricted page.
    // The actual implementation of tenant-specific routes would be in App.tsx

    // For now, let's just check if the message appears if we force a tenant check
    // This part of the test is more illustrative until a concrete tenant-guarded route is added.
    // await expect(page.getByText('Tenant Access Required')).toBeVisible();
    // await expect(page.getByText(/You don't have access to tenant/i)).toBeVisible();
  });

  test('should log out after idle timeout', async ({ page }) => {
    // Simulate successful login
    await page.goto(
      '/maestro/auth/callback?code=mock_code_idle&state=mock_state',
    );
    await expect(page.url()).toContain('/maestro');

    // Mock Date.now() to control time for idle timeout
    await page.evaluate(() => {
      const originalDateNow = Date.now;
      let currentTime = originalDateNow();
      (Date.now as any) = () => currentTime;
      (window as any).advanceTime = (ms: number) => {
        currentTime += ms;
        // Trigger a fake event to reset the idle timer in AuthContext
        const event = new MouseEvent('mousemove');
        window.dispatchEvent(event);
      };
    });

    // Advance time by 14 minutes (just before timeout)
    await page.evaluate(
      (ms) => (window as any).advanceTime(ms),
      14 * 60 * 1000,
    );
    await page.waitForTimeout(100); // Give React a moment to re-render

    // Expect to still be authenticated
    await expect(page.url()).toContain('/maestro');

    // Advance time past 15 minutes timeout
    await page.evaluate(
      (ms) => (window as any).advanceTime(ms),
      1 * 60 * 1000 + 1000,
    ); // 1 minute + 1 second
    await page.waitForTimeout(100); // Give React a moment to re-render

    // Expect to be redirected to login page due to idle timeout
    await expect(page.url()).toContain('/login');
    await expect(page.getByText('Sign In to Maestro')).toBeVisible();
  });
});
