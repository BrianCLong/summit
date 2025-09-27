import { entityById } from '@summit/srpl';
import type { Database } from './types';

export async function loadUser(db: Database, id: string) {
  return db.query(entityById({ table: 'users', id }));
}
