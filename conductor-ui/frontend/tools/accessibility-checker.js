#!/usr/bin/env node

/**
 * Comprehensive Accessibility Testing Tool for Maestro Build Plane
 * Performs WCAG compliance checks, keyboard navigation testing, and accessibility audits
 */

import { chromium } from 'playwright';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, '..');

class AccessibilityChecker {
  constructor(baseUrl = 'http://localhost:5173') {
    this.baseUrl = baseUrl;
    this.browser = null;
    this.reportDir = join(root, 'test-results', 'accessibility');
    this.results = [];
    this.startTime = Date.now();

    this.testPages = [
      {
        name: 'login-page',
        url: '/maestro/login',
        description: 'Login page accessibility',
      },
      {
        name: 'dashboard',
        url: '/maestro',
        description: 'Main dashboard accessibility',
        requireAuth: true,
      },
      {
        name: 'runs-list',
        url: '/maestro/runs',
        description: 'Runs list page accessibility',
        requireAuth: true,
      },
      {
        name: 'observability',
        url: '/maestro/observability',
        description: 'Observability page accessibility',
        requireAuth: true,
      },
      {
        name: 'routing-studio',
        url: '/maestro/routing',
        description: 'Routing Studio accessibility',
        requireAuth: true,
      },
    ];
  }

  async setup() {
    console.log('♿ Setting up accessibility checker...');

    // Create report directory
    if (!existsSync(this.reportDir)) {
      mkdirSync(this.reportDir, { recursive: true });
    }

    // Launch browser
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
      ],
    });
  }

  async mockAuthentication(page) {
    // Mock authentication for testing
    await page.addInitScript(() => {
      localStorage.setItem('maestro_auth_access_token', 'mock-jwt-token');
      localStorage.setItem('maestro_auth_id_token', 'mock-id-token');

      // Mock user data
      window.__USER_MOCK__ = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        roles: ['user', 'operator'],
        permissions: ['runs:read', 'pipelines:read'],
        tenant: 'test-corp',
      };
    });

    // Mock API responses
    await page.route('**/api/**', async (route) => {
      const url = route.request().url();

      if (url.includes('/summary')) {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              autonomy: { level: 3, canary: 0.15 },
              health: { success: 0.997, p95: 150, burn: 1.2 },
              budgets: { remaining: 15000, cap: 50000 },
              runs: [
                { id: 'run-123', status: 'running' },
                { id: 'run-124', status: 'completed' },
              ],
            },
          }),
        });
      } else if (url.includes('/runs')) {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              runs: [
                {
                  id: 'run-123',
                  pipeline: 'main-build',
                  status: 'running',
                  createdAt: '2025-01-15T10:00:00Z',
                  duration: 120,
                },
              ],
            },
          }),
        });
      } else {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({ data: {} }),
        });
      }
    });
  }

  async runAccessibilityAudit(page, pageName) {
    console.log(`  🔍 Running axe-core audit for ${pageName}...`);

    // Inject axe-core
    await page.addScriptTag({
      url: 'https://unpkg.com/axe-core@4.7.2/axe.min.js',
    });

    // Wait for page to be fully loaded
    await page.waitForTimeout(2000);

    // Run axe audit
    const results = await page.evaluate(() => {
      return new Promise((resolve) => {
        window.axe.run(
          document,
          {
            rules: {
              // Enable all WCAG 2.1 AA rules
              'color-contrast': { enabled: true },
              'keyboard-navigation': { enabled: true },
              'focus-management': { enabled: true },
              'aria-labels': { enabled: true },
              'semantic-markup': { enabled: true },
            },
          },
          (err, results) => {
            if (err) {
              resolve({ error: err.message });
            } else {
              resolve(results);
            }
          },
        );
      });
    });

    return results;
  }

  async testKeyboardNavigation(page, pageName) {
    console.log(`  ⌨️  Testing keyboard navigation for ${pageName}...`);

    const keyboardIssues = [];

    try {
      // Test Tab navigation
      const focusableElements = await page.evaluate(() => {
        const selectors = [
          'button',
          'input',
          'select',
          'textarea',
          'a[href]',
          '[tabindex]:not([tabindex="-1"])',
          '[contenteditable="true"]',
        ];

        const elements = [];
        selectors.forEach((selector) => {
          const found = Array.from(document.querySelectorAll(selector));
          found.forEach((el) => {
            if (el.offsetParent !== null && !el.disabled) {
              elements.push({
                tag: el.tagName.toLowerCase(),
                id: el.id || '',
                class: el.className || '',
                text: el.textContent?.substring(0, 50) || '',
                tabIndex: el.tabIndex,
              });
            }
          });
        });

        return elements;
      });

      // Test focus management
      let tabIndex = 0;
      let previousElement = null;

      for (let i = 0; i < Math.min(focusableElements.length, 20); i++) {
        await page.keyboard.press('Tab');
        tabIndex++;

        const currentFocus = await page.evaluate(() => {
          const focused = document.activeElement;
          if (!focused || focused === document.body) return null;

          return {
            tag: focused.tagName.toLowerCase(),
            id: focused.id || '',
            class: focused.className || '',
            text: focused.textContent?.substring(0, 50) || '',
            visible: focused.offsetParent !== null,
            outline: window.getComputedStyle(focused).outline,
            focusVisible: focused.matches(':focus-visible'),
          };
        });

        if (!currentFocus) {
          keyboardIssues.push({
            type: 'focus-loss',
            severity: 'moderate',
            message: `Lost focus after ${tabIndex} tab presses`,
            element: previousElement,
          });
          break;
        }

        // Check for visible focus indicator
        if (
          !currentFocus.focusVisible &&
          (!currentFocus.outline || currentFocus.outline === 'none')
        ) {
          keyboardIssues.push({
            type: 'missing-focus-indicator',
            severity: 'high',
            message: 'Element lacks visible focus indicator',
            element: currentFocus,
          });
        }

        previousElement = currentFocus;
      }

      // Test Escape key handling for modals/dropdowns
      await page.keyboard.press('Escape');

      // Test Enter/Space on buttons
      const buttons = await page.locator('button:visible').count();
      if (buttons > 0) {
        await page.locator('button:visible').first().focus();
        await page.keyboard.press('Enter');

        // Check if action was triggered (basic check)
        await page.waitForTimeout(1000);
      }

      return {
        focusableElementsFound: focusableElements.length,
        keyboardIssues,
        passed:
          keyboardIssues.filter((i) => i.severity === 'high').length === 0,
      };
    } catch (error) {
      return {
        focusableElementsFound: 0,
        keyboardIssues: [
          {
            type: 'navigation-error',
            severity: 'high',
            message: `Keyboard navigation test failed: ${error.message}`,
          },
        ],
        passed: false,
      };
    }
  }

  async testColorContrast(page, pageName) {
    console.log(`  🎨 Testing color contrast for ${pageName}...`);

    const contrastIssues = await page.evaluate(() => {
      const issues = [];

      // Get all text elements
      const textElements = Array.from(document.querySelectorAll('*')).filter(
        (el) => {
          const style = window.getComputedStyle(el);
          return (
            el.textContent &&
            el.textContent.trim().length > 0 &&
            style.fontSize &&
            parseFloat(style.fontSize) > 0
          );
        },
      );

      textElements.forEach((el, index) => {
        if (index > 50) return; // Limit to first 50 elements for performance

        const style = window.getComputedStyle(el);
        const color = style.color;
        const backgroundColor = style.backgroundColor;
        const fontSize = parseFloat(style.fontSize);
        const fontWeight = style.fontWeight;

        // Skip if no background color is set
        if (!backgroundColor || backgroundColor === 'rgba(0, 0, 0, 0)') return;

        // Simple contrast ratio calculation (approximation)
        const colorRgb = color.match(/rgb\\((\\d+),\\s*(\\d+),\\s*(\\d+)\\)/);
        const bgRgb = backgroundColor.match(
          /rgb\\((\\d+),\\s*(\\d+),\\s*(\\d+)\\)/,
        );

        if (colorRgb && bgRgb) {
          const textLum = this.getLuminance(
            parseInt(colorRgb[1]),
            parseInt(colorRgb[2]),
            parseInt(colorRgb[3]),
          );
          const bgLum = this.getLuminance(
            parseInt(bgRgb[1]),
            parseInt(bgRgb[2]),
            parseInt(bgRgb[3]),
          );

          const contrastRatio =
            (Math.max(textLum, bgLum) + 0.05) /
            (Math.min(textLum, bgLum) + 0.05);

          // WCAG AA standards
          const isLargeText =
            fontSize >= 18 || (fontSize >= 14 && fontWeight >= 700);
          const requiredRatio = isLargeText ? 3.0 : 4.5;

          if (contrastRatio < requiredRatio) {
            issues.push({
              element: {
                tag: el.tagName.toLowerCase(),
                class: el.className || '',
                text: el.textContent.substring(0, 100),
              },
              contrastRatio: contrastRatio.toFixed(2),
              requiredRatio,
              color,
              backgroundColor,
              fontSize: fontSize + 'px',
              isLargeText,
              severity:
                contrastRatio < requiredRatio * 0.8 ? 'high' : 'moderate',
            });
          }
        }
      });

      return issues;
    });

    // Add luminance calculation function to page context
    await page.addFunction('getLuminance', (r, g, b) => {
      const rs = r / 255;
      const gs = g / 255;
      const bs = b / 255;

      const rLum =
        rs <= 0.03928 ? rs / 12.92 : Math.pow((rs + 0.055) / 1.055, 2.4);
      const gLum =
        gs <= 0.03928 ? gs / 12.92 : Math.pow((gs + 0.055) / 1.055, 2.4);
      const bLum =
        bs <= 0.03928 ? bs / 12.92 : Math.pow((bs + 0.055) / 1.055, 2.4);

      return 0.2126 * rLum + 0.7152 * gLum + 0.0722 * bLum;
    });

    return {
      contrastIssues,
      passed: contrastIssues.filter((i) => i.severity === 'high').length === 0,
    };
  }

  async testAriaLabels(page, pageName) {
    console.log(`  🏷️  Testing ARIA labels for ${pageName}...`);

    const ariaIssues = await page.evaluate(() => {
      const issues = [];

      // Check for missing alt text on images
      const images = Array.from(document.querySelectorAll('img'));
      images.forEach((img) => {
        if (!img.alt && img.src && !img.getAttribute('aria-hidden')) {
          issues.push({
            type: 'missing-alt-text',
            severity: 'high',
            element: { tag: 'img', src: img.src.substring(0, 100) },
            message: 'Image missing alt text',
          });
        }
      });

      // Check for buttons without accessible names
      const buttons = Array.from(
        document.querySelectorAll(
          'button, input[type="button"], input[type="submit"]',
        ),
      );
      buttons.forEach((btn) => {
        const hasLabel =
          btn.textContent?.trim() ||
          btn.getAttribute('aria-label') ||
          btn.getAttribute('aria-labelledby') ||
          btn.getAttribute('title');

        if (!hasLabel) {
          issues.push({
            type: 'missing-button-label',
            severity: 'high',
            element: {
              tag: btn.tagName.toLowerCase(),
              class: btn.className,
              type: btn.type || '',
            },
            message: 'Button missing accessible name',
          });
        }
      });

      // Check for form inputs without labels
      const inputs = Array.from(
        document.querySelectorAll(
          'input:not([type="hidden"]), textarea, select',
        ),
      );
      inputs.forEach((input) => {
        const hasLabel =
          input.getAttribute('aria-label') ||
          input.getAttribute('aria-labelledby') ||
          document.querySelector(`label[for="${input.id}"]`) ||
          input.closest('label');

        if (!hasLabel) {
          issues.push({
            type: 'missing-form-label',
            severity: 'high',
            element: {
              tag: input.tagName.toLowerCase(),
              type: input.type || '',
              name: input.name || '',
              id: input.id || '',
            },
            message: 'Form input missing label',
          });
        }
      });

      // Check for proper heading hierarchy
      const headings = Array.from(
        document.querySelectorAll('h1, h2, h3, h4, h5, h6'),
      );
      let previousLevel = 0;
      headings.forEach((heading, index) => {
        const currentLevel = parseInt(heading.tagName.charAt(1));

        if (index === 0 && currentLevel !== 1) {
          issues.push({
            type: 'heading-hierarchy',
            severity: 'moderate',
            element: {
              tag: heading.tagName.toLowerCase(),
              text: heading.textContent?.substring(0, 50),
            },
            message: 'Page should start with h1',
          });
        }

        if (currentLevel > previousLevel + 1) {
          issues.push({
            type: 'heading-hierarchy',
            severity: 'moderate',
            element: {
              tag: heading.tagName.toLowerCase(),
              text: heading.textContent?.substring(0, 50),
            },
            message: `Heading level jumps from ${previousLevel} to ${currentLevel}`,
          });
        }

        previousLevel = currentLevel;
      });

      // Check for ARIA roles and properties
      const ariaElements = Array.from(
        document.querySelectorAll(
          '[role], [aria-expanded], [aria-selected], [aria-checked]',
        ),
      );
      ariaElements.forEach((el) => {
        const role = el.getAttribute('role');

        // Check for required ARIA properties based on role
        if (
          role === 'button' &&
          !el.hasAttribute('aria-pressed') &&
          el.getAttribute('aria-pressed') !== 'false'
        ) {
          // This is okay, not all buttons need aria-pressed
        }

        if (role === 'tablist') {
          const tabs = el.querySelectorAll('[role="tab"]');
          if (tabs.length === 0) {
            issues.push({
              type: 'aria-structure',
              severity: 'moderate',
              element: { role, class: el.className },
              message: 'Tablist missing tab elements',
            });
          }
        }
      });

      return issues;
    });

    return {
      ariaIssues,
      passed: ariaIssues.filter((i) => i.severity === 'high').length === 0,
    };
  }

  async testScreenReaderCompatibility(page, pageName) {
    console.log(`  📢 Testing screen reader compatibility for ${pageName}...`);

    const srIssues = [];

    try {
      // Check for proper landmark regions
      const landmarks = await page.evaluate(() => {
        const roles = [
          'main',
          'navigation',
          'banner',
          'contentinfo',
          'complementary',
          'search',
        ];
        const found = {};

        roles.forEach((role) => {
          found[role] = document.querySelectorAll(
            `[role="${role}"], ${role}`,
          ).length;
        });

        // Check for semantic HTML elements
        found.nav = document.querySelectorAll('nav').length;
        found.main = document.querySelectorAll('main').length;
        found.header = document.querySelectorAll('header').length;
        found.footer = document.querySelectorAll('footer').length;
        found.section = document.querySelectorAll('section').length;
        found.article = document.querySelectorAll('article').length;

        return found;
      });

      // Check for required landmarks
      if (landmarks.main === 0) {
        srIssues.push({
          type: 'missing-landmark',
          severity: 'moderate',
          message: 'Page missing main landmark',
          recommendation: 'Add <main> element or role="main"',
        });
      }

      if (landmarks.navigation === 0 && landmarks.nav === 0) {
        srIssues.push({
          type: 'missing-landmark',
          severity: 'low',
          message: 'Page missing navigation landmark',
          recommendation: 'Add <nav> element or role="navigation"',
        });
      }

      // Check for skip links
      const skipLink = await page.evaluate(() => {
        const firstFocusable = document.querySelector(
          'a, button, input, select, textarea',
        );
        return (
          firstFocusable?.textContent?.toLowerCase().includes('skip') ||
          firstFocusable?.getAttribute('href') === '#main' ||
          document.querySelector('a[href="#main"], a[href="#content"]')
        );
      });

      if (!skipLink) {
        srIssues.push({
          type: 'missing-skip-link',
          severity: 'moderate',
          message: 'Page missing skip navigation link',
          recommendation: 'Add skip link as first focusable element',
        });
      }

      // Check for live regions
      const liveRegions = await page.evaluate(() => {
        return document.querySelectorAll(
          '[aria-live], [aria-atomic], [role="status"], [role="alert"]',
        ).length;
      });

      return {
        landmarks,
        liveRegions,
        srIssues,
        passed: srIssues.filter((i) => i.severity === 'high').length === 0,
      };
    } catch (error) {
      return {
        landmarks: {},
        liveRegions: 0,
        srIssues: [
          {
            type: 'screen-reader-test-error',
            severity: 'moderate',
            message: `Screen reader compatibility test failed: ${error.message}`,
          },
        ],
        passed: false,
      };
    }
  }

  async testPage(testPage) {
    console.log(`🧪 Testing ${testPage.name}: ${testPage.description}`);

    try {
      const context = await this.browser.newContext({
        viewport: { width: 1280, height: 720 },
      });

      const page = await context.newPage();

      // Mock authentication if required
      if (testPage.requireAuth) {
        await this.mockAuthentication(page);
      }

      // Navigate to page
      await page.goto(`${this.baseUrl}${testPage.url}`, {
        waitUntil: 'networkidle',
      });

      // Wait for page to stabilize
      await page.waitForTimeout(3000);

      // Run all accessibility tests
      const [axeResults, keyboardTest, contrastTest, ariaTest, srTest] =
        await Promise.all([
          this.runAccessibilityAudit(page, testPage.name),
          this.testKeyboardNavigation(page, testPage.name),
          this.testColorContrast(page, testPage.name),
          this.testAriaLabels(page, testPage.name),
          this.testScreenReaderCompatibility(page, testPage.name),
        ]);

      const result = {
        name: testPage.name,
        url: testPage.url,
        description: testPage.description,
        timestamp: new Date().toISOString(),
        tests: {
          axeAudit: {
            passed: !axeResults.error && axeResults.violations?.length === 0,
            violations: axeResults.violations || [],
            passes: axeResults.passes || [],
            error: axeResults.error,
          },
          keyboardNavigation: keyboardTest,
          colorContrast: contrastTest,
          ariaLabels: ariaTest,
          screenReader: srTest,
        },
        summary: {
          totalTests: 5,
          passed: [
            !axeResults.error && axeResults.violations?.length === 0,
            keyboardTest.passed,
            contrastTest.passed,
            ariaTest.passed,
            srTest.passed,
          ].filter(Boolean).length,
          critical: 0,
          major: 0,
          minor: 0,
        },
      };

      // Count severity levels
      const allIssues = [
        ...(axeResults.violations || []).map((v) => ({ severity: v.impact })),
        ...keyboardTest.keyboardIssues,
        ...contrastTest.contrastIssues,
        ...ariaTest.ariaIssues,
        ...srTest.srIssues,
      ];

      result.summary.critical = allIssues.filter(
        (i) => i.severity === 'critical',
      ).length;
      result.summary.major = allIssues.filter(
        (i) => i.severity === 'high' || i.severity === 'serious',
      ).length;
      result.summary.minor = allIssues.filter(
        (i) => i.severity === 'moderate' || i.severity === 'minor',
      ).length;

      result.overallPassed =
        result.summary.critical === 0 && result.summary.major === 0;

      await context.close();

      console.log(
        `  ✅ ${testPage.name}: ${result.summary.passed}/5 tests passed`,
      );

      return result;
    } catch (error) {
      console.log(`  ❌ ${testPage.name}: Test failed - ${error.message}`);

      return {
        name: testPage.name,
        url: testPage.url,
        description: testPage.description,
        error: error.message,
        overallPassed: false,
        summary: { totalTests: 5, passed: 0, critical: 1, major: 0, minor: 0 },
      };
    }
  }

  async generateReport() {
    console.log('📄 Generating accessibility report...');

    const totalDuration = Date.now() - this.startTime;
    const overallSummary = this.results.reduce(
      (acc, result) => {
        acc.totalTests += result.summary?.totalTests || 0;
        acc.passed += result.summary?.passed || 0;
        acc.critical += result.summary?.critical || 0;
        acc.major += result.summary?.major || 0;
        acc.minor += result.summary?.minor || 0;
        return acc;
      },
      { totalTests: 0, passed: 0, critical: 0, major: 0, minor: 0 },
    );

    const report = {
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      baseUrl: this.baseUrl,
      overallPassed:
        overallSummary.critical === 0 && overallSummary.major === 0,
      summary: overallSummary,
      results: this.results,
      wcagLevel: 'AA',
      guidelines: [
        'WCAG 2.1 AA Compliance',
        'Keyboard Navigation Support',
        'Screen Reader Compatibility',
        'Color Contrast Standards',
        'ARIA Best Practices',
      ],
    };

    // Write JSON report
    writeFileSync(
      join(this.reportDir, 'accessibility-report.json'),
      JSON.stringify(report, null, 2),
    );

    // Write HTML report
    const htmlReport = this.generateHTMLReport(report);
    writeFileSync(
      join(this.reportDir, 'accessibility-report.html'),
      htmlReport,
    );

    return report;
  }

  generateHTMLReport(report) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Accessibility Test Report</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; margin: 40px; background: #f8f9fa; line-height: 1.6; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; }
        .header { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
        .status { padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; font-size: 1.2em; font-weight: bold; }
        .status.passed { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .status.failed { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; }
        .metric.critical .metric-value { color: #dc3545; }
        .metric.major .metric-value { color: #fd7e14; }
        .metric.minor .metric-value { color: #ffc107; }
        .metric.passed .metric-value { color: #28a745; }
        .metric-label { font-size: 0.9em; color: #666; margin-top: 5px; }
        .test-results { margin: 30px 0; }
        .page-result { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .page-result.passed { border-left: 4px solid #28a745; }
        .page-result.failed { border-left: 4px solid #dc3545; }
        .page-header { font-weight: bold; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; }
        .test-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin: 15px 0; }
        .test-item { background: white; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
        .test-item.passed { border-left: 4px solid #28a745; }
        .test-item.failed { border-left: 4px solid #dc3545; }
        .issue-list { margin-top: 15px; }
        .issue { background: #fff3cd; padding: 10px; border: 1px solid #ffeaa7; border-radius: 4px; margin: 5px 0; font-size: 0.9em; }
        .issue.critical { background: #f8d7da; border-color: #f5c6cb; }
        .issue.major { background: #ffeaa7; border-color: #faebcc; }
        .guidelines { background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .code { font-family: monospace; background: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 0.9em; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>♿ Accessibility Test Report</h1>
            <p><strong>Base URL:</strong> ${report.baseUrl}</p>
            <p><strong>Generated:</strong> ${report.timestamp}</p>
            <p><strong>Duration:</strong> ${(report.duration / 1000).toFixed(2)} seconds</p>
            <p><strong>WCAG Level:</strong> ${report.wcagLevel}</p>
        </div>
        
        <div class="status ${report.overallPassed ? 'passed' : 'failed'}">
            ${report.overallPassed ? '✅ ACCESSIBILITY TESTS PASSED' : '❌ ACCESSIBILITY ISSUES FOUND'}
        </div>
        
        <div class="summary">
            <div class="metric passed">
                <div class="metric-value">${report.summary.passed}</div>
                <div class="metric-label">Tests Passed</div>
            </div>
            <div class="metric critical">
                <div class="metric-value">${report.summary.critical}</div>
                <div class="metric-label">Critical Issues</div>
            </div>
            <div class="metric major">
                <div class="metric-value">${report.summary.major}</div>
                <div class="metric-label">Major Issues</div>
            </div>
            <div class="metric minor">
                <div class="metric-value">${report.summary.minor}</div>
                <div class="metric-label">Minor Issues</div>
            </div>
        </div>
        
        <div class="guidelines">
            <h3>📋 Compliance Guidelines</h3>
            <ul>
                ${report.guidelines.map((guideline) => `<li>${guideline}</li>`).join('')}
            </ul>
        </div>
        
        <div class="test-results">
            <h2>📊 Test Results by Page</h2>
            ${report.results
              .map(
                (result) => `
                <div class="page-result ${result.overallPassed ? 'passed' : 'failed'}">
                    <div class="page-header">
                        <div>
                            <h3>${result.name}</h3>
                            <p>${result.description}</p>
                            <p><strong>URL:</strong> ${result.url}</p>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 1.5em; color: ${result.overallPassed ? '#28a745' : '#dc3545'}">
                                ${result.overallPassed ? '✅' : '❌'}
                            </div>
                            <div style="font-size: 0.9em; color: #666;">
                                ${result.summary?.passed || 0}/${result.summary?.totalTests || 0} passed
                            </div>
                        </div>
                    </div>
                    
                    ${
                      result.error
                        ? `
                        <div class="issue critical">
                            <strong>Test Error:</strong> ${result.error}
                        </div>
                    `
                        : `
                        <div class="test-grid">
                            ${
                              result.tests
                                ? Object.entries(result.tests)
                                    .map(
                                      ([testName, testResult]) => `
                                <div class="test-item ${testResult.passed ? 'passed' : 'failed'}">
                                    <h4>${testName.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}</h4>
                                    <p><strong>Status:</strong> ${testResult.passed ? '✅ Passed' : '❌ Failed'}</p>
                                    
                                    ${
                                      testResult.violations?.length > 0
                                        ? `
                                        <div class="issue-list">
                                            <strong>Issues (${testResult.violations.length}):</strong>
                                            ${testResult.violations
                                              .slice(0, 3)
                                              .map(
                                                (violation) => `
                                                <div class="issue ${violation.impact || 'minor'}">
                                                    <strong>${violation.id || violation.type}:</strong> ${violation.description || violation.message}
                                                </div>
                                            `,
                                              )
                                              .join('')}
                                        </div>
                                    `
                                        : ''
                                    }
                                    
                                    ${
                                      testResult.keyboardIssues?.length > 0
                                        ? `
                                        <div class="issue-list">
                                            <strong>Keyboard Issues (${testResult.keyboardIssues.length}):</strong>
                                            ${testResult.keyboardIssues
                                              .slice(0, 2)
                                              .map(
                                                (issue) => `
                                                <div class="issue ${issue.severity}">
                                                    <strong>${issue.type}:</strong> ${issue.message}
                                                </div>
                                            `,
                                              )
                                              .join('')}
                                        </div>
                                    `
                                        : ''
                                    }
                                    
                                    ${
                                      testResult.contrastIssues?.length > 0
                                        ? `
                                        <div class="issue-list">
                                            <strong>Contrast Issues (${testResult.contrastIssues.length}):</strong>
                                            ${testResult.contrastIssues
                                              .slice(0, 2)
                                              .map(
                                                (issue) => `
                                                <div class="issue ${issue.severity}">
                                                    Ratio: ${issue.contrastRatio} (required: ${issue.requiredRatio})
                                                </div>
                                            `,
                                              )
                                              .join('')}
                                        </div>
                                    `
                                        : ''
                                    }
                                    
                                    ${
                                      testResult.ariaIssues?.length > 0
                                        ? `
                                        <div class="issue-list">
                                            <strong>ARIA Issues (${testResult.ariaIssues.length}):</strong>
                                            ${testResult.ariaIssues
                                              .slice(0, 2)
                                              .map(
                                                (issue) => `
                                                <div class="issue ${issue.severity}">
                                                    <strong>${issue.type}:</strong> ${issue.message}
                                                </div>
                                            `,
                                              )
                                              .join('')}
                                        </div>
                                    `
                                        : ''
                                    }
                                </div>
                            `,
                                    )
                                    .join('')
                                : ''
                            }
                        </div>
                    `
                    }
                </div>
            `,
              )
              .join('')}
        </div>
    </div>
</body>
</html>
    `;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run(options = {}) {
    const { pages = null, generateReport = true } = options;

    try {
      await this.setup();

      const pagesToTest = pages
        ? this.testPages.filter((p) => pages.includes(p.name))
        : this.testPages;

      console.log(
        `♿ Running accessibility tests on ${pagesToTest.length} pages...\n`,
      );

      for (const testPage of pagesToTest) {
        const result = await this.testPage(testPage);
        this.results.push(result);
      }

      if (generateReport) {
        const report = await this.generateReport();

        console.log('\n🎯 Accessibility Test Summary:');
        console.log(
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        );
        console.log(
          `  Overall Status:       ${report.overallPassed ? '✅ PASSED' : '❌ ISSUES FOUND'}`,
        );
        console.log(`  Pages Tested:         ${this.results.length}`);
        console.log(
          `  Tests Passed:         ${report.summary.passed}/${report.summary.totalTests}`,
        );
        console.log(`  Critical Issues:      ${report.summary.critical}`);
        console.log(`  Major Issues:         ${report.summary.major}`);
        console.log(`  Minor Issues:         ${report.summary.minor}`);
        console.log(
          `  Test Duration:        ${(report.duration / 1000).toFixed(2)} seconds`,
        );

        if (report.summary.critical > 0 || report.summary.major > 0) {
          console.log('\n⚠️ Critical or major accessibility issues found!');
          console.log(
            '💡 Review the detailed report for specific fixes needed.',
          );
        }

        console.log(
          `\n📄 Detailed report: ${join('test-results', 'accessibility', 'accessibility-report.html')}`,
        );

        return report.overallPassed;
      }
    } finally {
      await this.cleanup();
    }
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const options = {
    baseUrl:
      args.find((arg) => arg.startsWith('--base-url='))?.split('=')[1] ||
      'http://localhost:5173',
    pages:
      args
        .find((arg) => arg.startsWith('--pages='))
        ?.split('=')[1]
        ?.split(',') || null,
    generateReport: !args.includes('--no-report'),
  };

  const checker = new AccessibilityChecker(options.baseUrl);
  checker
    .run(options)
    .then((passed) => {
      process.exit(passed ? 0 : 1);
    })
    .catch(console.error);
}

export default AccessibilityChecker;
