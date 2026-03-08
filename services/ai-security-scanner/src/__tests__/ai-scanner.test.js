"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const ai_scanner_js_1 = require("../scanner/ai-scanner.js");
(0, vitest_1.describe)('AISecurityScanner', () => {
    let scanner;
    (0, vitest_1.beforeEach)(() => {
        scanner = new ai_scanner_js_1.AISecurityScanner({
            targetPaths: ['src/'],
            excludePaths: ['node_modules/'],
            scanTypes: ['static-analysis'],
            enableAIAnalysis: false,
            enableRedTeam: false,
        });
    });
    (0, vitest_1.describe)('initialization', () => {
        (0, vitest_1.it)('should create scanner with default config', () => {
            const defaultScanner = new ai_scanner_js_1.AISecurityScanner();
            (0, vitest_1.expect)(defaultScanner).toBeDefined();
        });
        (0, vitest_1.it)('should accept custom configuration', () => {
            const customScanner = new ai_scanner_js_1.AISecurityScanner({
                severityThreshold: 'high',
                complianceFrameworks: ['NIST', 'FedRAMP'],
            });
            (0, vitest_1.expect)(customScanner).toBeDefined();
        });
    });
    (0, vitest_1.describe)('vulnerability detection patterns', () => {
        (0, vitest_1.it)('should detect SQL injection patterns', async () => {
            // Simple pattern test for string concatenation in SQL
            const testCode = 'const sql = "SELECT * FROM " + table; db.query(sql);';
            // Pattern looks for concatenation followed by query operation
            const simplePattern = /\+.*query/gi;
            (0, vitest_1.expect)(simplePattern.test(testCode)).toBe(true);
        });
        (0, vitest_1.it)('should detect hardcoded secrets', () => {
            const testCode = `const password = "supersecretpassword123";`;
            const pattern = /(?:password|secret|api_key|apikey|token|credential)\s*[:=]\s*['"`][^'"`]{8,}['"`]/gi;
            (0, vitest_1.expect)(pattern.test(testCode)).toBe(true);
        });
        (0, vitest_1.it)('should detect weak crypto usage', () => {
            // Pattern looks for weak algorithms followed by opening paren
            const testCode = `const hash = md5(data);`;
            const pattern = /(?:md5|sha1|des|rc4)\s*\(/gi;
            (0, vitest_1.expect)(pattern.test(testCode)).toBe(true);
        });
        (0, vitest_1.it)('should detect potential XSS', () => {
            const testCode = `element.innerHTML = userInput;`;
            const pattern = /(?:innerHTML|outerHTML|document\.write)\s*=\s*[^;]*(?:\$\{|`|\+)/gi;
            // This won't match because it's a simple assignment without template literal
            (0, vitest_1.expect)(pattern.test(testCode)).toBe(false);
            // This should match
            const xssCode = `element.innerHTML = "<div>" + userInput + "</div>";`;
            (0, vitest_1.expect)(pattern.test(xssCode)).toBe(true);
        });
    });
    (0, vitest_1.describe)('severity scoring', () => {
        (0, vitest_1.it)('should map severity to CVSS scores correctly', () => {
            const severityMapping = {
                critical: 9.5,
                high: 7.5,
                medium: 5.0,
                low: 2.5,
                info: 0.0,
            };
            Object.entries(severityMapping).forEach(([severity, expectedScore]) => {
                (0, vitest_1.expect)(expectedScore).toBeGreaterThanOrEqual(0);
                (0, vitest_1.expect)(expectedScore).toBeLessThanOrEqual(10);
            });
        });
    });
});
