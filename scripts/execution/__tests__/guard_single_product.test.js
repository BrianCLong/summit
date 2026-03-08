"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const guard_single_product_js_1 = require("../guard_single_product.js"); // Using .js extension for ESM imports
(0, vitest_1.describe)('Single Product Guardrail', () => {
    const config = {
        active_product: 'factflow',
        frozen_products: ['factlaw', 'factmarkets', 'factapi'],
        allowed_paths_always: ['docs/', 'scripts/', 'config/'],
        override_file: '.exec-override'
    };
    (0, vitest_1.it)('should pass for allowed paths', () => {
        const files = ['docs/README.md', 'scripts/test.ts', 'config/settings.json'];
        const violations = (0, guard_single_product_js_1.validateFiles)(files, config);
        (0, vitest_1.expect)(violations).toEqual([]);
    });
    (0, vitest_1.it)('should pass for active product files', () => {
        const files = ['server/src/factflow/api.ts'];
        // Assuming "factflow" is NOT in frozen_products, so it shouldn't trigger violation.
        // The logic checks if path segment matches ANY frozen product.
        const violations = (0, guard_single_product_js_1.validateFiles)(files, config);
        (0, vitest_1.expect)(violations).toEqual([]);
    });
    (0, vitest_1.it)('should fail for frozen product files', () => {
        const files = ['packages/factlaw/src/index.ts'];
        const violations = (0, guard_single_product_js_1.validateFiles)(files, config);
        (0, vitest_1.expect)(violations).toEqual(['packages/factlaw/src/index.ts']);
    });
    (0, vitest_1.it)('should fail for multiple frozen product files', () => {
        const files = ['packages/factlaw/src/index.ts', 'factmarkets/report.json'];
        const violations = (0, guard_single_product_js_1.validateFiles)(files, config);
        (0, vitest_1.expect)(violations).toHaveLength(2);
        (0, vitest_1.expect)(violations).toContain('packages/factlaw/src/index.ts');
        (0, vitest_1.expect)(violations).toContain('factmarkets/report.json');
    });
    (0, vitest_1.it)('should handle nested paths correctly', () => {
        const files = ['some/deep/path/factapi/file.ts'];
        const violations = (0, guard_single_product_js_1.validateFiles)(files, config);
        (0, vitest_1.expect)(violations).toEqual(['some/deep/path/factapi/file.ts']);
    });
    (0, vitest_1.it)('should allow files that do not match frozen products', () => {
        const files = ['some/other/feature.ts'];
        const violations = (0, guard_single_product_js_1.validateFiles)(files, config);
        (0, vitest_1.expect)(violations).toEqual([]);
    });
});
