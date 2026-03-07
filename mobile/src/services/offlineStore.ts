import * as SQLite from "expo-sqlite";
import { encryptData, decryptData } from "./encryption";

export type OutboundRecord = {
  id: number;
  payload: Record<string, unknown>;
  createdAt: number;
};

const db = SQLite.openDatabase("summit-intel.db");

export async function ensureOfflineStore(): Promise<void> {
  await runTx((tx) =>
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
  const encrypted = await encryptData(serialized);
  await runTx((tx) =>
    tx.executeSql("INSERT INTO outbound_queue (payload) VALUES (?)", [encrypted])
  );
}

export async function readOldest(limit = 50): Promise<OutboundRecord[]> {
  // 1. Fetch raw encrypted rows
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawRows = await new Promise<any[]>((resolve, reject) => {
    db.readTransaction((tx) => {
      tx.executeSql(
        "SELECT id, payload, created_at as createdAt FROM outbound_queue ORDER BY id ASC LIMIT ?",
        [limit],
        (_, rs) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const rows: any[] = [];
          for (let i = 0; i < rs.rows.length; i++) {
            rows.push(rs.rows.item(i));
          }
          resolve(rows);
        },
        (_tx, error) => {
          reject(error);
          return true;
        }
      );
    }, reject);
  });

  // 2. Decrypt asynchronously outside the transaction
  const results: OutboundRecord[] = [];
  for (const row of rawRows) {
    try {
      const decrypted = await decryptData(row.payload as string);
      results.push({
        id: row.id as number,
        payload: JSON.parse(decrypted),
        createdAt: row.createdAt as number,
      });
    } catch (e) {
      console.error("Failed to decrypt record", row.id, e);
      // Skip corrupted records or handle error
    }
  }

  return results;
}

export async function deleteRecords(ids: number[]): Promise<void> {
  if (!ids.length) return;
  const placeholders = ids.map(() => "?").join(",");
  await runTx((tx) =>
    tx.executeSql(`DELETE FROM outbound_queue WHERE id IN (${placeholders})`, ids)
  );
}

export async function countQueue(): Promise<number> {
  return new Promise((resolve, reject) => {
    db.readTransaction((tx) => {
      tx.executeSql(
        "SELECT COUNT(*) as total FROM outbound_queue",
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
