"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = up;
exports.down = down;
// @ts-nocheck
const kysely_1 = require("kysely");
async function up(db) {
    await db.schema
        .createTable('finops_policies')
        .addColumn('id', 'text', (col) => col.primaryKey())
        .addColumn('tenant_id', 'text', (col) => col.notNull())
        .addColumn('name', 'text', (col) => col.notNull())
        .addColumn('description', 'text')
        .addColumn('enabled', 'boolean', (col) => col.defaultTo(true))
        .addColumn('rules', 'jsonb', (col) => col.notNull())
        .addColumn('created_at', 'timestamp', (col) => col.defaultTo((0, kysely_1.sql) `now()`))
        .addColumn('updated_at', 'timestamp', (col) => col.defaultTo((0, kysely_1.sql) `now()`))
        .execute();
    await db.schema
        .createIndex('idx_finops_policies_tenant')
        .on('finops_policies')
        .column('tenant_id')
        .execute();
}
async function down(db) {
    await db.schema.dropTable('finops_policies').execute();
}
