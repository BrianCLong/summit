import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { TenantIsolationGuard, TenantIsolationConfig, RateLimiterLike } from '../tenancy/TenantIsolationGuard.js';
import { TenantKillSwitch } from '../tenancy/killSwitch.js';
import { TenantContext } from '../tenancy/types.js';

class InMemoryLimiter implements RateLimiterLike {
  private buckets: Map<string, { count: number; reset: number }> = new Map();

  async checkLimit(
    key: string,
    limit: number,
    windowMs: number,
  ) {
    const now = Date.now();
    const current = this.buckets.get(key);
    if (!current || current.reset < now) {
      this.buckets.set(key, { count: 1, reset: now + windowMs });
      return {
        allowed: true,
        total: limit,
        remaining: limit - 1,
        reset: now + windowMs,
      };
    }

    current.count += 1;
    const allowed = current.count <= limit;
    this.buckets.set(key, current);
    return {
      allowed,
      total: limit,
      remaining: Math.max(0, limit - current.count),
      reset: current.reset,
    };
  }
}

const baseContext: TenantContext = {
  tenantId: 'tenant-a',
  environment: 'dev',
  privilegeTier: 'standard',
};

const testConfig: TenantIsolationConfig = {
  defaultWindowMs: 25,
  rateLimits: { api: 1, ingestion: 1, rag: 1, llm: 1 },
  llmSoftCeiling: 1,
};

describe('TenantIsolationGuard', () => {
  it('denies cross-tenant access attempts', () => {
    const guard = new TenantIsolationGuard(new InMemoryLimiter(), new TenantKillSwitch('/nonexistent'), testConfig);
    const decision = guard.evaluatePolicy(baseContext, {
      action: 'read',
      resourceTenantId: 'tenant-b',
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('Cross-tenant');
  });

  it('enforces per-tenant rate limits', async () => {
    const guard = new TenantIsolationGuard(new InMemoryLimiter(), new TenantKillSwitch('/nonexistent'), testConfig);
    const first = await guard.enforceRateLimit(baseContext, 'api');
    const second = await guard.enforceRateLimit(baseContext, 'api');

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(false);
    expect(second.reset).toBeGreaterThan(Date.now());
  });

  it('honors kill switch config without redeploys', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tenant-kill-'));
    const killFile = path.join(tmpDir, 'switch.json');
    const now = Date.now();

    fs.writeFileSync(killFile, JSON.stringify({ 'tenant-a': true }), 'utf-8');
    // Ensure mtime is older so the next write is seen as new
    fs.utimesSync(killFile, new Date(now - 10000), new Date(now - 10000));

    const killSwitch = new TenantKillSwitch(killFile);
    const guard = new TenantIsolationGuard(new InMemoryLimiter(), killSwitch, testConfig);

    const decision = guard.evaluatePolicy(baseContext, { action: 'read' });
    expect(decision.allowed).toBe(false);
    expect(decision.status).toBe(423);

    // Update file and ensure timestamp is newer
    fs.writeFileSync(killFile, JSON.stringify({ 'tenant-a': false }), 'utf-8');
    fs.utimesSync(killFile, new Date(now + 1000), new Date(now + 1000));

    const reopened = guard.evaluatePolicy(baseContext, { action: 'read' });
    expect(reopened.allowed).toBe(true);
  });

  it('fails closed when kill-switch config is missing in prod', () => {
    const killSwitch = new TenantKillSwitch('/definitely/missing.json');
    const guard = new TenantIsolationGuard(new InMemoryLimiter(), killSwitch, testConfig);
    const decision = guard.evaluatePolicy(
      { ...baseContext, environment: 'prod' },
      { action: 'read' },
    );

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('Kill-switch configuration missing');
  });
});
