import * as SQLite from 'expo-sqlite';

export type OutboundRecord = {
  id: number;
  payload: Record<string, unknown>;
  createdAt: number;
};

const db = SQLite.openDatabase('summit-intel.db');

export async function ensureOfflineStore(): Promise<void> {
  await runTx(tx =>
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS outbound_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        payload TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s','now')),
        attempts INTEGER DEFAULT 0
      )`
    )
  );
}

export async function enqueuePayload(payload: Record<string, unknown>): Promise<void> {
  const serialized = JSON.stringify(payload);
  await runTx(tx => tx.executeSql('INSERT INTO outbound_queue (payload) VALUES (?)', [serialized]));
}

export async function readOldest(limit = 50): Promise<OutboundRecord[]> {
  return new Promise((resolve, reject) => {
    db.readTransaction(tx => {
      tx.executeSql(
        'SELECT id, payload, created_at as createdAt FROM outbound_queue ORDER BY id ASC LIMIT ?',
        [limit],
        (_, rs) => {
          const results: OutboundRecord[] = [];
          for (let i = 0; i < rs.rows.length; i += 1) {
            const row = rs.rows.item(i);
            results.push({
              id: row.id as number,
              payload: JSON.parse(row.payload as string),
              createdAt: row.createdAt as number
            });
          }
          resolve(results);
        },
        (_tx, error) => {
          reject(error);
          return true;
        }
      );
    }, reject);
  });
}

export async function deleteRecords(ids: number[]): Promise<void> {
  if (!ids.length) return;
  const placeholders = ids.map(() => '?').join(',');
  await runTx(tx => tx.executeSql(`DELETE FROM outbound_queue WHERE id IN (${placeholders})`, ids));
}

export async function countQueue(): Promise<number> {
  return new Promise((resolve, reject) => {
    db.readTransaction(tx => {
      tx.executeSql(
        'SELECT COUNT(*) as total FROM outbound_queue',
        [],
        (_, rs) => {
          resolve((rs.rows.item(0).total as number) ?? 0);
        },
        (_tx, error) => {
          reject(error);
          return true;
        }
      );
    }, reject);
  });
}

function runTx(fn: (tx: SQLite.SQLTransaction) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    db.transaction(fn, reject, resolve);
  });
}
