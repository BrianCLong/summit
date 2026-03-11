import { describe, it, expect } from 'vitest';
import { version } from '../index.js';

describe('types module', () => {
  it('exports version string', () => {
    expect(version).toBe('1.0.0');
  });
});
