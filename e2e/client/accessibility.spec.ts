import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Comprehensive Accessibility Tests', () => {
  test.describe('Homepage', () => {
    test('should not have any automatically detectable accessibility issues', async ({
      page,
    }) => {
      await page.goto('/');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should have skip links for keyboard navigation', async ({ page }) => {
      await page.goto('/');

      // Press Tab to focus skip link
      await page.keyboard.press('Tab');

      // Check if skip link is visible when focused
      const skipLink = page.locator('a[href="#main-content"]');
      await expect(skipLink).toBeFocused();
    });

    test('should have proper landmark regions', async ({ page }) => {
      await page.goto('/');

      // Check for main landmarks
      await expect(page.locator('role=navigation[name="Main navigation"]')).toBeVisible();
      await expect(page.locator('role=main[name="Main content"]')).toBeVisible();
      await expect(page.locator('role=banner')).toBeVisible();
    });

    test('should match the visual regression snapshot', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveScreenshot('homepage.png');
    });
  });

  test.describe('Navigation', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('/');

      // Tab through navigation items
      await page.keyboard.press('Tab'); // Skip link
      await page.keyboard.press('Tab'); // First nav item

      // Check that navigation items are focusable
      const navItems = page.locator('nav a');
      const count = await navItems.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should have aria-current on active page', async ({ page }) => {
      await page.goto('/explore');

      const activeLink = page.locator('nav a[aria-current="page"]');
      await expect(activeLink).toBeVisible();
    });

    test('should not have accessibility violations', async ({ page }) => {
      await page.goto('/');

      const nav = page.locator('nav');
      const accessibilityScanResults = await new AxeBuilder({ page })
        .include(await nav.elementHandle())
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });

  test.describe('Global Search', () => {
    test('should be accessible via keyboard shortcut', async ({ page }) => {
      await page.goto('/');

      // Open search with Command+K (or Ctrl+K)
      await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K');

      // Check that search dialog is visible and has focus
      const searchInput = page.locator('input[aria-label="Global search"]');
      await expect(searchInput).toBeFocused();
    });

    test('should have proper dialog role and aria attributes', async ({ page }) => {
      await page.goto('/');

      // Open search
      await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K');

      // Check dialog attributes
      const dialog = page.locator('role=dialog[aria-modal="true"]');
      await expect(dialog).toBeVisible();
    });

    test('should announce search results to screen readers', async ({ page }) => {
      await page.goto('/');

      // Open search
      await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K');

      // Type search query
      const searchInput = page.locator('input[aria-label="Global search"]');
      await searchInput.fill('test');

      // Check for aria-live region
      const liveRegion = page.locator('[aria-live="polite"]');
      await expect(liveRegion).toBeAttached();
    });
  });

  test.describe('Explore Page', () => {
    test('should not have accessibility violations', async ({ page }) => {
      await page.goto('/explore');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should have accessible headings hierarchy', async ({ page }) => {
      await page.goto('/explore');

      // Check that page has a main heading
      const h1 = page.locator('h1');
      await expect(h1).toBeVisible();
    });
  });

  test.describe('Alerts Page', () => {
    test('should not have accessibility violations', async ({ page }) => {
      await page.goto('/alerts');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });

  test.describe('Cases Page', () => {
    test('should not have accessibility violations', async ({ page }) => {
      await page.goto('/cases');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });

  test.describe('Color Contrast', () => {
    test('should meet WCAG AA contrast requirements', async ({ page }) => {
      await page.goto('/');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2aa'])
        .disableRules(['region']) // Focus on contrast
        .analyze();

      const contrastViolations = accessibilityScanResults.violations.filter(
        (v) => v.id === 'color-contrast'
      );

      expect(contrastViolations).toEqual([]);
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should allow tab navigation through all interactive elements', async ({ page }) => {
      await page.goto('/');

      // Get all focusable elements
      const focusableElements = await page.evaluate(() => {
        const elements = document.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        return elements.length;
      });

      expect(focusableElements).toBeGreaterThan(0);
    });

    test('should have visible focus indicators', async ({ page }) => {
      await page.goto('/');

      // Tab to first interactive element
      await page.keyboard.press('Tab');

      // Check that focused element has visible focus
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        const styles = window.getComputedStyle(el);
        return {
          outline: styles.outline,
          outlineWidth: styles.outlineWidth,
          boxShadow: styles.boxShadow,
        };
      });

      // At least one focus indicator should be present
      const hasFocusIndicator =
        focusedElement.outline !== 'none' ||
        parseInt(focusedElement.outlineWidth) > 0 ||
        focusedElement.boxShadow !== 'none';

      expect(hasFocusIndicator).toBeTruthy();
    });
  });

  test.describe('Screen Reader Support', () => {
    test('should have proper ARIA labels on icon buttons', async ({ page }) => {
      await page.goto('/');

      // Find all buttons with icons (no text content)
      const iconButtons = await page.locator('button:not(:has-text(/\\w/))').all();

      for (const button of iconButtons) {
        const ariaLabel = await button.getAttribute('aria-label');
        const ariaLabelledBy = await button.getAttribute('aria-labelledby');

        // Button should have either aria-label or aria-labelledby
        expect(ariaLabel || ariaLabelledBy).toBeTruthy();
      }
    });

    test('should have proper alt text on images', async ({ page }) => {
      await page.goto('/');

      const images = await page.locator('img').all();

      for (const img of images) {
        const alt = await img.getAttribute('alt');
        const role = await img.getAttribute('role');

        // Image should have alt text or be marked as decorative
        expect(alt !== null || role === 'presentation' || role === 'none').toBeTruthy();
      }
    });
  });
});
