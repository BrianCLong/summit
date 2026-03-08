"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const postgres_js_1 = require("../db/postgres.js");
const logger_js_1 = __importDefault(require("../config/logger.js"));
async function locateSchema() {
    const pool = (0, postgres_js_1.getPostgresPool)();
    try {
        logger_js_1.default.info('Introspecting Postgres schema for "entities" table...');
        const res = await pool.read(`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'entities'
      ORDER BY ordinal_position;
    `);
        if (res.rows.length === 0) {
            console.log('❌ "entities" table not found in the public schema.');
            console.log('It might be in a different schema or not created yet.');
            return;
        }
        console.log('\n✅ "entities" table found. Schema definition:');
        console.table(res.rows);
        // Also check for constraints/keys
        const keys = await pool.read(`
      SELECT
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name
      FROM
        information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
      WHERE tc.table_name = 'entities';
    `);
        if (keys.rows.length > 0) {
            console.log('\nConstraints:');
            console.table(keys.rows);
        }
    }
    catch (err) {
        logger_js_1.default.error('Failed to introspect schema', err);
    }
    finally {
        await (0, postgres_js_1.closePostgresPool)();
    }
}
locateSchema();
