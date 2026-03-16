import { describe, it, expect } from 'vitest';
import { version, Result } from '../index.js';

describe('shared module', () => {
  it('exports version string', () => {
    expect(version).toBe('1.0.0');
  });

  it('Result type has success property', () => {
    // Basic structural checks
    const successResult: Result<number> = { success: true, data: 123 };
    const errorResult: Result<number> = { success: false, error: new Error('test') };

    expect(successResult.success).toBe(true);
    if (successResult.success) {
      expect(successResult.data).toBe(123);
    }

    expect(errorResult.success).toBe(false);
    if (!errorResult.success) {
      expect(errorResult.error.message).toBe('test');
    }
  });
});
