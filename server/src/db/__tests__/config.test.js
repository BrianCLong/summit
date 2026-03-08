"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const config_js_1 = require("../config.js");
(0, globals_1.describe)('db config', () => {
    (0, globals_1.it)('disables aggressive tuning when DB_POOL_TUNING is off', () => {
        const cfg = (0, config_js_1.buildDbConfig)({});
        (0, globals_1.expect)(cfg.tuningEnabled).toBe(false);
        (0, globals_1.expect)(cfg.statementTimeoutMs).toBe(0);
        (0, globals_1.expect)(cfg.maxLifetimeSeconds).toBeUndefined();
    });
    (0, globals_1.it)('enables tuning values and clamps pool sizes', () => {
        const cfg = (0, config_js_1.buildDbConfig)({
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
        });
        (0, globals_1.expect)(cfg.tuningEnabled).toBe(true);
        (0, globals_1.expect)(cfg.maxPoolSize).toBe(200);
        (0, globals_1.expect)(cfg.readPoolSize).toBe(200);
        (0, globals_1.expect)(cfg.maxLifetimeSeconds).toBe(60);
        (0, globals_1.expect)(cfg.maxUses).toBe(10000);
        (0, globals_1.expect)(cfg.statementTimeoutMs).toBe(12000);
        (0, globals_1.expect)(cfg.idleInTransactionTimeoutMs).toBe(3000);
        (0, globals_1.expect)(cfg.lockTimeoutMs).toBe(4000);
    });
});
