"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
const eslint_1 = require("eslint");
const vitest_1 = require("vitest");
const design_token_restrictions_1 = require("../../tools/eslint/design-token-restrictions");
const baseConfig = {
    languageOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        parserOptions: {
            ecmaFeatures: { jsx: true },
        },
    },
    rules: {
        'no-restricted-syntax': ['error', ...design_token_restrictions_1.designTokenRestrictions],
    },
};
const lint = (source) => {
    const linter = new eslint_1.Linter({ configType: 'flat' });
    return linter.verify(source, baseConfig);
};
(0, vitest_1.describe)('design token lint guardrails', () => {
    (0, vitest_1.it)('flags literal spacing and radii values', () => {
        const messages = lint(`
        const styles = {
          padding: "12px",
          borderRadius: 6
        }
      `);
        (0, vitest_1.expect)(messages).toHaveLength(2);
        (0, vitest_1.expect)(messages[0].message).toContain('design tokens');
    });
    (0, vitest_1.it)('allows css variable based tokens', () => {
        const messages = lint(`
        const styles = {
          padding: "var(--ds-space-md)",
          borderRadius: "var(--ds-radius-lg)",
          boxShadow: \`0 0 0 var(--ds-space-xs) var(--ds-shadow-sm)\`
        }
      `);
        (0, vitest_1.expect)(messages).toHaveLength(0);
    });
});
