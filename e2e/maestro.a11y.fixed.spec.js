"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// =============================================
// File: e2e/maestro.a11y.fixed.spec.ts
// =============================================
const test_1 = require("@playwright/test");
const playwright_1 = __importDefault(require("@axe-core/playwright"));
test_1.test.describe('Maestro — Accessibility Testing', () => {
    (0, test_1.test)('main page should be accessible', async ({ page }) => {
        test_1.test.setTimeout(60000);
        const resp = await page.goto('/');
        if (!resp?.ok()) {
            test_1.test.skip(`Skipping a11y: target returned ${resp?.status()}`);
        }
        // Wait for page to be fully loaded
        await page.waitForLoadState('networkidle', { timeout: 30000 });
        // Run accessibility test on main page
        const results = await new playwright_1.default({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze();
        // Log all violations for debugging
        if (results.violations && results.violations.length > 0) {
            console.log('Accessibility violations found:', results.violations.map((v) => ({
                id: v.id,
                impact: v.impact,
                description: v.description,
                nodes: v.nodes.length,
            })));
        }
        // Record the total number of violations
        test_1.test.info().annotations.push({
            type: 'a11y-total-violations',
            description: String(results.violations?.length || 0),
        });
        // Only fail on critical and serious violations
        const critical = (results.violations || []).filter((v) => v.impact === 'critical' || v.impact === 'serious');
        const minor = (results.violations || []).filter((v) => v.impact === 'moderate' || v.impact === 'minor');
        if (minor.length > 0) {
            console.log(`Found ${minor.length} minor/moderate a11y issues that should be addressed:`, minor.map((v) => `${v.id}: ${v.description}`));
        }
        // Record critical violations count
        test_1.test.info().annotations.push({
            type: 'a11y-critical-violations',
            description: String(critical.length),
        });
        (0, test_1.expect)(critical).toEqual([]);
    });
    (0, test_1.test)('admin studio should be accessible', async ({ page }) => {
        test_1.test.setTimeout(60000);
        const resp = await page.goto('/admin');
        if (!resp?.ok()) {
            test_1.test.skip(`Skipping admin a11y: target returned ${resp?.status()}`);
        }
        await page.waitForLoadState('networkidle', { timeout: 30000 });
        const results = await new playwright_1.default({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze();
        if (results.violations && results.violations.length > 0) {
            console.log('Admin page violations:', results.violations.map((v) => ({
                id: v.id,
                impact: v.impact,
                description: v.description,
            })));
        }
        test_1.test.info().annotations.push({
            type: 'a11y-admin-violations',
            description: String(results.violations?.length || 0),
        });
        const critical = (results.violations || []).filter((v) => v.impact === 'critical' || v.impact === 'serious');
        (0, test_1.expect)(critical).toEqual([]);
    });
    (0, test_1.test)('observability page should be accessible', async ({ page }) => {
        test_1.test.setTimeout(60000);
        const resp = await page.goto('/observability');
        if (!resp?.ok()) {
            test_1.test.skip(`Skipping observability a11y: target returned ${resp?.status()}`);
        }
        await page.waitForLoadState('networkidle', { timeout: 30000 });
        const results = await new playwright_1.default({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze();
        if (results.violations && results.violations.length > 0) {
            console.log('Observability page violations:', results.violations.map((v) => ({
                id: v.id,
                impact: v.impact,
                description: v.description,
            })));
        }
        test_1.test.info().annotations.push({
            type: 'a11y-observability-violations',
            description: String(results.violations?.length || 0),
        });
        const critical = (results.violations || []).filter((v) => v.impact === 'critical' || v.impact === 'serious');
        (0, test_1.expect)(critical).toEqual([]);
    });
});
