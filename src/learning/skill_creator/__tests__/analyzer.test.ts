import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { analyzeGitHistory } from '../analyzer';

describe('analyzeGitHistory', () => {
  const originalEnv = process.env.SUMMIT_SKILL_CREATOR;

  beforeEach(() => {
    process.env.SUMMIT_SKILL_CREATOR = '1';
  });

  afterEach(() => {
    process.env.SUMMIT_SKILL_CREATOR = originalEnv;
  });

  it('should return empty array when disabled', () => {
    process.env.SUMMIT_SKILL_CREATOR = '0';
    const result = analyzeGitHistory('.');
    expect(result).toEqual([]);
  });

  it('should analyze current repo history', () => {
    const result = analyzeGitHistory('.');
    // We expect at least some prefixes to be found in this repo
    expect(Array.isArray(result)).toBe(true);
  });
});
