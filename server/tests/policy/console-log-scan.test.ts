describe('findConsoleLogViolations', () => {
  test('flags console.log calls on added lines', () => {
    const {
      findConsoleLogViolations,
    } = require('../../../scripts/ci/console-log-scan.cjs');
    const source = [
      'const value = 42;',
      'console.log("debug", value);',
      'return value;',
    ].join('\n');
    const added = new Set([2]);
    const violations = findConsoleLogViolations(source, added);
    expect(violations).toEqual([
      {
        line: 2,
        code: 'console.log("debug", value);',
      },
    ]);
  });

  test('ignores console.log calls outside the diff', () => {
    const {
      findConsoleLogViolations,
    } = require('../../../scripts/ci/console-log-scan.cjs');
    const source = [
      'console.log("existing");',
      'console.log("still existing");',
    ].join('\n');
    const added = new Set([3]);
    const violations = findConsoleLogViolations(source, added);
    expect(violations).toHaveLength(0);
  });
});
