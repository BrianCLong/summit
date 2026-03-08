"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const playwright_1 = __importDefault(require("@axe-core/playwright"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const focus_order_1 = require("../src/focus-order");
const heatmap_overlay_1 = require("../src/heatmap-overlay");
const ARTIFACT_DIR = node_path_1.default.join(process.cwd(), 'artifacts');
const REPORT_PATH = node_path_1.default.join(ARTIFACT_DIR, 'axe-report.json');
function ensureArtifacts() {
    if (!node_fs_1.default.existsSync(ARTIFACT_DIR)) {
        node_fs_1.default.mkdirSync(ARTIFACT_DIR, { recursive: true });
    }
}
test_1.test.describe('Accessibility gates', () => {
    test_1.test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL ?? 'http://localhost:3000');
    });
    (0, test_1.test)('axe-core finds no critical violations and captures artifacts', async ({ page }) => {
        const builder = new playwright_1.default({ page }).withTags(['wcag2a', 'wcag2aa']);
        const results = await builder.analyze();
        ensureArtifacts();
        node_fs_1.default.writeFileSync(REPORT_PATH, JSON.stringify({ ...results, violations: sanitize(results.violations) }, null, 2));
        const critical = results.violations.filter((v) => v.impact === 'critical');
        (0, test_1.expect)(critical, 'Critical accessibility regressions detected').toHaveLength(0);
        const contrastViolations = results.violations.filter((v) => v.id === 'color-contrast');
        const contrastBudget = contrastViolations.length;
        // contrast budget: flag loudly if it exceeds 2
        (0, test_1.expect)(contrastBudget, 'Contrast budget exceeded').toBeLessThanOrEqual(2);
        // store an analytics-free heatmap snippet for optional embedding
        const snippet = (0, heatmap_overlay_1.getHeatmapSnippet)({ ...results, violations: sanitize(results.violations) });
        node_fs_1.default.writeFileSync(node_path_1.default.join(ARTIFACT_DIR, 'heatmap-snippet.js'), snippet);
    });
    (0, test_1.test)('focus order walk does not get trapped', async ({ page }) => {
        const focusMap = await (0, focus_order_1.walkFocusOrder)(page);
        ensureArtifacts();
        node_fs_1.default.writeFileSync(node_path_1.default.join(ARTIFACT_DIR, 'focus-order.json'), JSON.stringify(focusMap, null, 2));
        (0, test_1.expect)(focusMap.trapped, 'Keyboard trap detected while tabbing through the page').toBeFalsy();
    });
});
function sanitize(violations) {
    return violations.map(({ id, impact, description, nodes, helpUrl }) => ({
        id,
        impact,
        description,
        helpUrl,
        nodes: nodes.map((node) => ({
            impact: node.impact,
            html: undefined,
            target: node.target,
            failureSummary: node.failureSummary,
        })),
    }));
}
