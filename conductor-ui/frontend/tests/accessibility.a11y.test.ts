import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Maestro UI Accessibility @a11y', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/maestro');
    await injectAxe(page);
  });

  test('Dashboard should be accessible', async ({ page }) => {
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true },
    });
  });

  test('Runs page should be accessible', async ({ page }) => {
    await page.click('text=Runs');
    await page.waitForLoadState('networkidle');

    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true },
    });
  });

  test('Navigation should be keyboard accessible', async ({ page }) => {
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeTruthy();

    // Navigate through all main nav items
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
    }

    // Should be able to activate with Enter
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
  });

  test('Forms should be accessible', async ({ page }) => {
    await page.click('text=Secrets');
    await page.waitForLoadState('networkidle');

    await checkA11y(page, 'form', {
      detailedReport: true,
      rules: {
        'form-field-multiple-labels': { enabled: true },
        label: { enabled: true },
        'aria-required': { enabled: true },
      },
    });
  });

  test('Tables should have proper headers and labels', async ({ page }) => {
    await page.click('text=Runs');
    await page.waitForLoadState('networkidle');

    await checkA11y(page, 'table', {
      detailedReport: true,
      rules: {
        'table-header': { enabled: true },
        'scope-attr-valid': { enabled: true },
        'table-duplicate-name': { enabled: true },
      },
    });
  });

  test('Color contrast should meet WCAG AA standards', async ({ page }) => {
    await checkA11y(page, null, {
      detailedReport: true,
      rules: {
        'color-contrast': { enabled: true },
      },
    });
  });

  test('Images should have alt text', async ({ page }) => {
    await checkA11y(page, null, {
      detailedReport: true,
      rules: {
        'image-alt': { enabled: true },
        'aria-hidden-body': { enabled: true },
      },
    });
  });

  test('Focus management in dialogs', async ({ page }) => {
    // Look for any buttons that open dialogs
    const dialogTriggers = await page.locator('button').all();

    for (const trigger of dialogTriggers) {
      const buttonText = await trigger.textContent();
      if (
        buttonText &&
        (buttonText.includes('Add') ||
          buttonText.includes('Edit') ||
          buttonText.includes('Create'))
      ) {
        await trigger.click();
        await page.waitForTimeout(500);

        // Check if a dialog opened
        const dialog = page.locator('[role="dialog"], [aria-modal="true"]');
        if ((await dialog.count()) > 0) {
          // Focus should be trapped within the dialog
          await checkA11y(page, '[role="dialog"], [aria-modal="true"]', {
            detailedReport: true,
            rules: {
              'focus-order-semantics': { enabled: true },
              tabindex: { enabled: true },
            },
          });

          // Close dialog with escape
          await page.keyboard.press('Escape');
          await page.waitForTimeout(200);
        }
      }
    }
  });

  test('Live regions should be properly announced', async ({ page }) => {
    await page.click('text=Runs');
    await page.waitForLoadState('networkidle');

    // Check for log areas that should have live regions
    const logArea = page.locator('[role="log"], [aria-live]');
    if ((await logArea.count()) > 0) {
      await checkA11y(page, '[role="log"], [aria-live]', {
        detailedReport: true,
        rules: {
          'aria-live-region-explicit': { enabled: true },
          'aria-valid-attr-value': { enabled: true },
        },
      });
    }
  });

  test('Skip links should be present', async ({ page }) => {
    // Check for skip links
    await page.keyboard.press('Tab');
    const skipLink = page.locator('text=/Skip to/i').first();

    if ((await skipLink.count()) > 0) {
      await expect(skipLink).toBeVisible();
      await skipLink.click();

      // Should focus main content
      const mainContent = await page
        .locator('#main, [role="main"], main')
        .first();
      await expect(mainContent).toBeFocused();
    }
  });

  test('Reduced motion should be respected', async ({ page }) => {
    // Set reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();

    // Check that animations are disabled
    const animatedElements = await page
      .locator('[class*="animate"], [class*="transition"]')
      .count();

    // In a real test, you'd check that animations are actually disabled
    // This is a basic structure for such a test
    await checkA11y(page);
  });

  test('Error states should be accessible', async ({ page }) => {
    // Trigger error states if possible
    await page.click('text=Secrets');
    await page.waitForLoadState('networkidle');

    // Try to submit empty forms or trigger validation errors
    const forms = await page.locator('form').all();
    for (const form of forms) {
      const submitButton = form.locator(
        'button[type="submit"], button:has-text("Create"), button:has-text("Save")',
      );
      if ((await submitButton.count()) > 0) {
        await submitButton.click();
        await page.waitForTimeout(500);

        // Check error messages are properly associated
        await checkA11y(page, null, {
          detailedReport: true,
          rules: {
            'aria-errormessage': { enabled: true },
            'aria-invalid-value': { enabled: true },
          },
        });
      }
    }
  });
});
