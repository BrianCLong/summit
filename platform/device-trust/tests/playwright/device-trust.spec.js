"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const posture_fixtures_json_1 = __importDefault(require("../../fixtures/posture-fixtures.json"));
const nonCompliant = posture_fixtures_json_1.default[0];
const remediated = posture_fixtures_json_1.default[1];
(0, test_1.test)('non-compliant → remediate → pass', async ({ page }) => {
    await page.setContent('<div id="status"></div><div id="actions"></div>');
    const evaluate = (fixture) => {
        const failed = fixture.localChecks.filter(check => !check.passed);
        return { passed: failed.length === 0, failed: failed.map(c => c.name) };
    };
    let result = evaluate(nonCompliant);
    await page.$eval('#status', (node, res) => {
        node.textContent = res.passed ? 'pass' : 'fail:' + res.failed.join(',');
    }, result);
    await (0, test_1.expect)(page.locator('#status')).toContainText('fail');
    result = evaluate(remediated);
    await page.$eval('#status', (node, res) => {
        node.textContent = res.passed ? 'pass' : 'fail:' + res.failed.join(',');
    }, result);
    await (0, test_1.expect)(page.locator('#status')).toHaveText('pass');
});
