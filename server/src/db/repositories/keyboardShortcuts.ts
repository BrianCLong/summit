import { Pool } from 'pg';
import { getPostgresPool } from '../../db/postgres.js';

export interface KeyboardShortcutOverride {
  id: string;
  userId: string;
  actionId: string;
  keys: string[];
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const pool: Pool = getPostgresPool();

const columns = `id, user_id AS "userId", action_id AS "actionId", keys, description, created_at AS "createdAt", updated_at AS "updatedAt"`;

export async function listUserKeyboardShortcuts(userId: string): Promise<KeyboardShortcutOverride[]> {
  const { rows } = await pool.query<KeyboardShortcutOverride>(
    `SELECT ${columns} FROM user_keyboard_shortcuts WHERE user_id = $1 ORDER BY action_id`,
    [userId],
  );
  return rows;
}

export async function upsertUserKeyboardShortcut(
  userId: string,
  actionId: string,
  keys: string[],
  description?: string | null,
): Promise<KeyboardShortcutOverride> {
  const { rows } = await pool.query<KeyboardShortcutOverride>(
    `INSERT INTO user_keyboard_shortcuts (user_id, action_id, keys, description)
     VALUES ($1, $2, $3, NULLIF($4, ''))
     ON CONFLICT (user_id, action_id)
     DO UPDATE SET keys = EXCLUDED.keys, description = COALESCE(EXCLUDED.description, user_keyboard_shortcuts.description), updated_at = now()
     RETURNING ${columns}`,
    [userId, actionId, keys, description ?? null],
  );
  return rows[0];
}

export async function removeUserKeyboardShortcuts(
  userId: string,
  actionIds?: string[],
): Promise<number> {
  if (actionIds && actionIds.length > 0) {
    const { rowCount } = await pool.query(
      'DELETE FROM user_keyboard_shortcuts WHERE user_id = $1 AND action_id = ANY($2::text[])',
      [userId, actionIds],
    );
    return rowCount ?? 0;
  }

  const { rowCount } = await pool.query('DELETE FROM user_keyboard_shortcuts WHERE user_id = $1', [userId]);
  return rowCount ?? 0;
}
