"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = migrate;
const pg_1 = require("pg");
async function migrate(pool) {
    const pg = pool || new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
    await pg.query(`
    CREATE TABLE IF NOT EXISTS cost_exporter_watermarks(
      id boolean PRIMARY KEY DEFAULT true,
      last_ts timestamptz NOT NULL DEFAULT '1970-01-01'
    );
    INSERT INTO cost_exporter_watermarks(id) VALUES (true) ON CONFLICT DO NOTHING;
  `);
}
