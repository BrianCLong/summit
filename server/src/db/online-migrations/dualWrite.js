"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DualWriter = void 0;
const metrics_js_1 = require("./metrics.js");
const state_js_1 = require("./state.js");
class DualWriter {
    pool;
    options;
    constructor(pool, options) {
        this.pool = pool;
        this.options = options;
    }
    async write(payload) {
        const migration = this.options.migrationKey;
        const operation = this.options.operation ?? 'mutation';
        (0, state_js_1.assertIdentifier)(operation, 'dual write operation');
        await (0, state_js_1.ensureOnlineMigrationTables)(this.pool);
        const client = await this.pool.connect();
        const start = Date.now();
        try {
            await client.query('BEGIN');
            await this.options.writePrimary(client, payload);
            const shouldShadow = this.options.enableShadow ? this.options.enableShadow(payload) : true;
            if (shouldShadow) {
                await this.options.writeShadow(client, payload);
            }
            await client.query('COMMIT');
            metrics_js_1.dualWriteDurationSeconds.observe({ migration, operation }, (Date.now() - start) / 1000);
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release?.();
        }
    }
}
exports.DualWriter = DualWriter;
