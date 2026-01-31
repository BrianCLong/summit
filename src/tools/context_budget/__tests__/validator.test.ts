import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateBudget, loadBudgetConfig } from '../validator';

describe('validateBudget', () => {
  it('should pass with healthy stats', () => {
    const stats = { configured: 5, enabled: 2, active: 10 };
    const result = validateBudget(stats);
    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it('should warn when approaching configured tools limit', () => {
    const stats = { configured: 25, enabled: 5, active: 10 };
    const result = validateBudget(stats);
    expect(result.valid).toBe(true);
    expect(result.warnings[0]).toContain('approaching the limit');
  });

  it('should warn and remain valid when exceeding configured tools limit', () => {
    const stats = { configured: 35, enabled: 5, active: 10 };
    const result = validateBudget(stats);
    expect(result.valid).toBe(true);
    expect(result.warnings[0]).toContain('exceeds suggested limit');
  });

  it('should error when exceeding enabled tools cap', () => {
    const stats = { configured: 10, enabled: 11, active: 10 };
    const result = validateBudget(stats);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('exceeds the hard cap');
  });

  it('should error when exceeding active tools limit', () => {
    const stats = { configured: 10, enabled: 5, active: 81 };
    const result = validateBudget(stats);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('exceeds the maximum active tool limit');
  });
});

describe('loadBudgetConfig', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'summit-budget-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should load config from file', () => {
    const configPath = path.join(tmpDir, 'budget.json');
    fs.writeFileSync(configPath, JSON.stringify({ maxEnabledTools: 5 }));
    const config = loadBudgetConfig(configPath);
    expect(config.maxEnabledTools).toBe(5);
    expect(config.maxConfiguredTools).toBe(30); // default
  });

  it('should return defaults if file missing', () => {
    const config = loadBudgetConfig('missing.json');
    expect(config.maxEnabledTools).toBe(10);
  });
});
