
import Database from 'better-sqlite3';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Resolve path relative to current working directory
const dbPath = path.resolve('ledger-throughput/sqlite/benchmark.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Use SQLite to simulate the contention
const db = new Database(dbPath);

export class SyncLedger {
  private tableName = 'sync_ledger';

  constructor() {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id TEXT NOT NULL,
        sequence_number INTEGER NOT NULL,
        previous_hash TEXT NOT NULL,
        current_hash TEXT NOT NULL,
        payload TEXT
      )
    `).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_tenant_seq ON ${this.tableName} (tenant_id, sequence_number DESC)`).run();
  }

  append(tenantId: string, payload: any) {
    // Simulate transaction lock by synchronous execution (SQLite default for write)
    const last = db.prepare(`SELECT sequence_number, current_hash FROM ${this.tableName} WHERE tenant_id = ? ORDER BY sequence_number DESC LIMIT 1`).get(tenantId) as any;

    let seq = 1;
    let prevHash = '0'.repeat(64);

    if (last) {
      seq = last.sequence_number + 1;
      prevHash = last.current_hash;
    }

    const currentHash = crypto.createHash('sha256').update(prevHash + JSON.stringify(payload)).digest('hex');

    db.prepare(`INSERT INTO ${this.tableName} (tenant_id, sequence_number, previous_hash, current_hash, payload) VALUES (?, ?, ?, ?, ?)`).run(tenantId, seq, prevHash, currentHash, JSON.stringify(payload));
  }
}

export class AsyncLedger {
  private tableName = 'async_ledger';
  private queue: Array<{ tenantId: string, payload: any, resolve: Function }> = [];
  private batchSize = 100;
  private interval = 10;
  private isRunning = false;

  constructor() {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id TEXT NOT NULL,
        sequence_number INTEGER NOT NULL,
        previous_hash TEXT NOT NULL,
        current_hash TEXT NOT NULL,
        payload TEXT
      )
    `).run();
    this.startWorker();
  }

  append(tenantId: string, payload: any): Promise<void> {
    return new Promise((resolve) => {
      this.queue.push({ tenantId, payload, resolve });
    });
  }

  private startWorker() {
    this.isRunning = true;
    const loop = async () => {
      while (this.isRunning) {
        if (this.queue.length > 0) {
          const batch = this.queue.splice(0, this.batchSize);
          this.processBatch(batch);
        } else {
          await new Promise(r => setTimeout(r, this.interval));
        }
      }
    };
    loop();
  }

  async stop() {
    this.isRunning = false;
    if (this.queue.length > 0) {
        const batch = this.queue.splice(0, this.queue.length);
        this.processBatch(batch);
    }
  }

  private processBatch(batch: Array<{ tenantId: string, payload: any, resolve: Function }>) {
    const insert = db.prepare(`INSERT INTO ${this.tableName} (tenant_id, sequence_number, previous_hash, current_hash, payload) VALUES (?, ?, ?, ?, ?)`);
    const selectLast = db.prepare(`SELECT sequence_number, current_hash FROM ${this.tableName} WHERE tenant_id = ? ORDER BY sequence_number DESC LIMIT 1`);

    // Group by tenant
    const byTenant: Record<string, typeof batch> = {};
    batch.forEach(item => {
      if (!byTenant[item.tenantId]) byTenant[item.tenantId] = [];
      byTenant[item.tenantId].push(item);
    });

    const transaction = db.transaction(() => {
        for (const tid of Object.keys(byTenant)) {
            const items = byTenant[tid];
            const last = selectLast.get(tid) as any;

            let seq = 1;
            let prevHash = '0'.repeat(64);

            if (last) {
              seq = last.sequence_number + 1;
              prevHash = last.current_hash;
            }

            for (const item of items) {
                const currentHash = crypto.createHash('sha256').update(prevHash + JSON.stringify(item.payload)).digest('hex');
                insert.run(tid, seq, prevHash, currentHash, JSON.stringify(item.payload));
                prevHash = currentHash;
                seq++;
                item.resolve();
            }
          }
    });

    transaction();
  }
}

async function run() {
    const sync = new SyncLedger();
    const asyncL = new AsyncLedger();
    const TENANT = 'bench';
    const COUNT = 1000;

    console.log(`Simulating ${COUNT} writes...`);

    // Sync
    const t1 = Date.now();
    for (let i = 0; i < COUNT; i++) {
        sync.append(TENANT, {i});
    }
    console.log(`Sync (SQLite): ${Date.now() - t1}ms`);

    // Async
    const t2 = Date.now();
    const proms = [];
    for (let i = 0; i < COUNT; i++) {
        proms.push(asyncL.append(TENANT, {i}));
    }
    await Promise.all(proms);
    console.log(`Async (SQLite Batch): ${Date.now() - t2}ms`);

    asyncL.stop();
}

run();
