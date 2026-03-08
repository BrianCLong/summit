"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const markdown_1 = require("./markdown");
(0, vitest_1.describe)('renderMarkdown', () => {
    (0, vitest_1.it)('sanitizes script tags', () => {
        const html = (0, markdown_1.renderMarkdown)('Hello <script>alert(1)</script>');
        (0, vitest_1.expect)(html).toContain('Hello');
        (0, vitest_1.expect)(html).not.toContain('<script>');
        (0, vitest_1.expect)(html).not.toContain('alert(1)');
    });
    (0, vitest_1.it)('strips javascript: urls', () => {
        const html = (0, markdown_1.renderMarkdown)('[link](javascript:alert("xss"))');
        (0, vitest_1.expect)(html).toContain('link');
        (0, vitest_1.expect)(html).not.toContain('javascript:');
    });
});
