"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = up;
exports.down = down;
async function up(db) {
    await db.query(`
    ALTER TABLE audit_logs
    ADD COLUMN previous_hash TEXT;
  `);
}
async function down(db) {
    await db.query(`
    ALTER TABLE audit_logs
    DROP COLUMN previous_hash;
  `);
}
