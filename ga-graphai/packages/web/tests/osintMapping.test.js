"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const osint_mapping_js_1 = require("../src/osint-mapping.js");
(0, vitest_1.describe)('osint mapping wizard', () => {
    (0, vitest_1.it)('flags PII fields', () => {
        const suggestions = (0, osint_mapping_js_1.buildOsintMappingSuggestions)({
            title: 'Sample report',
            link: 'https://example.com',
            contact: 'analyst@example.com',
        });
        const pii = suggestions.find((suggestion) => suggestion.field === 'contact');
        (0, vitest_1.expect)(pii?.piiWarning).toBe('email');
    });
});
