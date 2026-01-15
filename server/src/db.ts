import { pool } from './db/pg.js';

/**
 * Legacy database export for backward compatibility.
 * Many services still expect 'db' to be exported from 'src/db.js'.
 */
export const db = pool;

export default db;
