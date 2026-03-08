"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = migrate;
const pg_1 = require("pg");
async function migrate(pool) {
    const pg = pool || new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
    await pg.query(`
    CREATE TABLE IF NOT EXISTS admission_events(
      id bigserial PRIMARY KEY,
      ts timestamptz DEFAULT now(),
      decision text NOT NULL,
      policy text,
      resource text,
      details jsonb
    );
    CREATE INDEX IF NOT EXISTS idx_admission_ts ON admission_events(ts);
    CREATE INDEX IF NOT EXISTS idx_admission_decision ON admission_events(decision);
  `);
}
