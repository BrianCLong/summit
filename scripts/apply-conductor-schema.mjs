#!/usr/bin/env node
import { readFileSync } from 'fs';
import pg from 'pg';

const { Pool } = pg;
const sql = readFileSync('db/001_conductor.sql', 'utf8');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    const client = await pool.connect();
    try {
      await client.query(sql);
      console.log('Conductor schema applied');
    } finally {
      client.release();
      await pool.end();
    }
  } catch (e) {
    console.error('Failed to apply schema:', e?.message || e);
    process.exit(1);
  }
})();
