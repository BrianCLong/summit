import {
  assertSafeArea,
  assertSafePath,
  assertSafeRef,
  parseRepository,
} from '../stack.js';

describe('prsplit stack security guards', () => {
  test('accepts expected safe inputs', () => {
    expect(assertSafeArea('server-api')).toBe('server-api');
    expect(assertSafePath('server/src/index.ts')).toBe('server/src/index.ts');
    expect(assertSafeRef('feature/hardening-1', 'branch')).toBe('feature/hardening-1');
    expect(parseRepository('intelgraph/summit')).toEqual({
      owner: 'intelgraph',
      repo: 'summit',
    });
  });

  test('rejects unsafe refs and area names', () => {
    expect(() => assertSafeArea('server;rm -rf /')).toThrow('Unsafe area name');
    expect(() => assertSafeRef('../main', 'base ref')).toThrow('Unsafe base ref');
    expect(() => assertSafeRef('-main', 'base ref')).toThrow('Unsafe base ref');
  });

  test('rejects unsafe file paths', () => {
    expect(() => assertSafePath('../secret.env')).toThrow('Unsafe file path');
    expect(() => assertSafePath('/etc/passwd')).toThrow('Unsafe file path');
    expect(() => assertSafePath('-A')).toThrow('Unsafe file path');
  });

  test('rejects malformed repository', () => {
    expect(() => parseRepository('missing-separator')).toThrow(
      'GITHUB_REPOSITORY must be set as owner/repo',
    );
  });
});
