describe('findUnhandledAwaitExpressions', () => {
  test('detects await expressions outside try/catch', () => {
    const {
      findUnhandledAwaitExpressions,
    } = require('../../../scripts/ci/async-error-scan.cjs');
    const source = `
      async function unsafe() {
        const result = await fetchData();
        return result;
      }
    `;
    const added = new Set([3]);
    const violations = findUnhandledAwaitExpressions(
      source,
      added,
      'unsafe.ts',
    );
    expect(violations).toEqual([
      expect.objectContaining({
        line: 3,
        message: expect.stringContaining('missing try/catch'),
      }),
    ]);
  });

  test('allows await within try/catch', () => {
    const {
      findUnhandledAwaitExpressions,
    } = require('../../../scripts/ci/async-error-scan.cjs');
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
    expect(violations).toHaveLength(0);
  });

  test('treats chained catch handlers as safe', () => {
    const {
      findUnhandledAwaitExpressions,
    } = require('../../../scripts/ci/async-error-scan.cjs');
    const source = `
      async function safeCatch() {
        return await fetchData().catch(() => null);
      }
    `;
    const added = new Set([3]);
    const violations = findUnhandledAwaitExpressions(
      source,
      added,
      'safe-catch.ts',
    );
    expect(violations).toHaveLength(0);
  });
});
