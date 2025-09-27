import type { Database } from './types';

export async function loadUser(db: Database, id: string) {
  return db.query(`SELECT id, email FROM users WHERE id = ${id}`);
}
