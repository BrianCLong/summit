import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { buildDbConfig } from '../config.js';

describe('db config', () => {
  it('disables aggressive tuning when DB_POOL_TUNING is off', () => {
    const cfg = buildDbConfig({});

    expect(cfg.tuningEnabled).toBe(false);
    expect(cfg.statementTimeoutMs).toBe(0);
    expect(cfg.maxLifetimeSeconds).toBeUndefined();
  });

  it('enables tuning values and clamps pool sizes', () => {
    const cfg = buildDbConfig({
      DB_POOL_TUNING: '1',
      PG_WRITE_POOL_SIZE: '500',
      PG_READ_POOL_SIZE: '500',
      DB_POOL_MAX_LIFETIME_SECONDS: '60',
      DB_POOL_MAX_USES: '10000',
      DB_POOL_IDLE_TIMEOUT_MS: '1000',
      DB_POOL_CONNECTION_TIMEOUT_MS: '2500',
      DB_STATEMENT_TIMEOUT_MS: '12000',
      DB_IDLE_IN_TX_TIMEOUT_MS: '3000',
      DB_LOCK_TIMEOUT_MS: '4000',
    } as NodeJS.ProcessEnv);

    expect(cfg.tuningEnabled).toBe(true);
    expect(cfg.maxPoolSize).toBe(200);
    expect(cfg.readPoolSize).toBe(200);
    expect(cfg.maxLifetimeSeconds).toBe(60);
    expect(cfg.maxUses).toBe(10000);
    expect(cfg.statementTimeoutMs).toBe(12000);
    expect(cfg.idleInTransactionTimeoutMs).toBe(3000);
    expect(cfg.lockTimeoutMs).toBe(4000);
  });
});
