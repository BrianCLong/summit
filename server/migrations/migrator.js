"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
const versioning_js_1 = require("../src/db/migrations/versioning.js");
/**
 * Postgres migration runner for managed SQL migrations.
 * Uses the typed MigrationManager to coordinate apply/rollback operations
 * while keeping compatibility with the legacy entrypoint signature.
 */
async function run(_name = 'default', _batch = 1000) {
    const manager = new versioning_js_1.MigrationManager();
    await manager.migrate();
}
