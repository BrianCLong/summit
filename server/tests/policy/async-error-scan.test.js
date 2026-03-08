"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('findUnhandledAwaitExpressions', () => {
    (0, globals_1.test)('detects await expressions outside try/catch', () => {
        const { findUnhandledAwaitExpressions, } = require('../../../scripts/ci/async-error-scan.cjs');
        const source = `
      async function unsafe() {
        const result = await fetchData();
        return result;
      }
    `;
        const added = new Set([3]);
        const violations = findUnhandledAwaitExpressions(source, added, 'unsafe.ts');
        (0, globals_1.expect)(violations).toEqual([
            globals_1.expect.objectContaining({
                line: 3,
                message: globals_1.expect.stringContaining('missing try/catch'),
            }),
        ]);
    });
    (0, globals_1.test)('allows await within try/catch', () => {
        const { findUnhandledAwaitExpressions, } = require('../../../scripts/ci/async-error-scan.cjs');
        const source = `
      async function safe() {
        try {
          return await fetchData();
        } catch (error) {
          return null;
        }
      }
    `;
        const added = new Set([4]);
        const violations = findUnhandledAwaitExpressions(source, added, 'safe.ts');
        (0, globals_1.expect)(violations).toHaveLength(0);
    });
    (0, globals_1.test)('treats chained catch handlers as safe', () => {
        const { findUnhandledAwaitExpressions, } = require('../../../scripts/ci/async-error-scan.cjs');
        const source = `
      async function safeCatch() {
        return await fetchData().catch(() => null);
      }
    `;
        const added = new Set([3]);
        const violations = findUnhandledAwaitExpressions(source, added, 'safe-catch.ts');
        (0, globals_1.expect)(violations).toHaveLength(0);
    });
});
