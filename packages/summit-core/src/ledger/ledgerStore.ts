import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import type { WriteSet } from "./writeset";
import { Database } from "duckdb-async";

export type LedgerStoreOpts = {
  dbPath: string; // e.g. .summit/ledger.duckdb
};

export class LedgerStore {
  private db!: Database;

  constructor(private opts: LedgerStoreOpts) {
    const dir = path.dirname(opts.dbPath);
    fs.mkdirSync(dir, { recursive: true });
  }

  async init(): Promise<void> {
    this.db = await Database.create(this.opts.dbPath);
    await this.exec(`
      CREATE TABLE IF NOT EXISTS ledger_writesets (
        writeset_id TEXT PRIMARY KEY,
        tx_time TIMESTAMP,
        sha256 TEXT,
        provenance_json JSON,
        writeset_json JSON
      );
    `);

    await this.exec(`
      CREATE TABLE IF NOT EXISTS ledger_links (
        writeset_id TEXT,
        from_id TEXT,
        to_id TEXT,
        type TEXT,
        weight DOUBLE
      );
    `);

    await this.exec(`
      CREATE TABLE IF NOT EXISTS ledger_claims (
        writeset_id TEXT,
        claim_id TEXT,
        statement TEXT,
        topic TEXT,
        valid_start TIMESTAMP,
        valid_end TIMESTAMP,
        confidence DOUBLE,
        confidence_method TEXT,
        confidence_rationale TEXT
      );
    `);

    await this.exec(`
      CREATE TABLE IF NOT EXISTS ledger_artifacts (
        writeset_id TEXT,
        artifact_id TEXT,
        kind TEXT,
        uri TEXT,
        observed_at TIMESTAMP,
        content_type TEXT,
        sha256 TEXT
      );
    `);

    await this.exec(`
      CREATE TABLE IF NOT EXISTS ledger_entities (
        writeset_id TEXT,
        entity_id TEXT,
        label TEXT,
        kind TEXT
      );
    `);
  }

  /**
   * Append-only ingestion.
   * If writeset_id already exists -> reject (immutability).
   */
  async appendWriteSet(ws: WriteSet): Promise<{ writeset_id: string; sha256: string }> {
    const raw = JSON.stringify(ws);
    const sha256 = crypto.createHash("sha256").update(raw).digest("hex");

    // Basic immutability: stable ID must not be reused
    const exists = await this.getOne<{ c: number }>(
      `SELECT COUNT(*)::INT as c FROM ledger_writesets WHERE writeset_id = ?`,
      [ws.writeset_id]
    );
    if (exists?.c && exists.c > 0) {
      throw new Error(`writeset_id already exists (append-only): ${ws.writeset_id}`);
    }

    await this.run(
      `INSERT INTO ledger_writesets(writeset_id, tx_time, sha256, provenance_json, writeset_json)
       VALUES (?, ?, ?, ?, ?)`,
      [ws.writeset_id, ws.tx_time, sha256, JSON.stringify(ws.provenance), raw]
    );

    for (const a of ws.artifacts) {
      await this.run(
        `INSERT INTO ledger_artifacts VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [ws.writeset_id, a.artifact_id, a.kind, a.uri, a.observed_at, a.content_type ?? null, a.sha256 ?? null]
      );
    }

    for (const c of ws.claims) {
      await this.run(
        `INSERT INTO ledger_claims VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ws.writeset_id,
          c.claim_id,
          c.statement,
          c.topic ?? null,
          c.valid_time.start,
          c.valid_time.end ?? null,
          c.confidence.score,
          c.confidence.method ?? null,
          c.confidence.rationale ?? null
        ]
      );
    }

    for (const l of ws.links) {
      await this.run(
        `INSERT INTO ledger_links VALUES (?, ?, ?, ?, ?)`,
        [ws.writeset_id, l.from, l.to, l.type, l.weight ?? null]
      );
    }

    for (const e of ws.entities ?? []) {
      await this.run(
        `INSERT INTO ledger_entities VALUES (?, ?, ?, ?)`,
        [ws.writeset_id, e.entity_id, e.label, e.kind]
      );
    }

    return { writeset_id: ws.writeset_id, sha256 };
  }

  /**
   * Export tables to Parquet (optional).
   * This is “foundation” for scalable lakehouse later.
   */
  async exportParquet(outDir: string): Promise<void> {
    fs.mkdirSync(outDir, { recursive: true });
    await this.exec(`COPY ledger_writesets TO '${path.join(outDir, "ledger_writesets.parquet")}' (FORMAT PARQUET);`);
    await this.exec(`COPY ledger_artifacts TO '${path.join(outDir, "ledger_artifacts.parquet")}' (FORMAT PARQUET);`);
    await this.exec(`COPY ledger_claims TO '${path.join(outDir, "ledger_claims.parquet")}' (FORMAT PARQUET);`);
    await this.exec(`COPY ledger_links TO '${path.join(outDir, "ledger_links.parquet")}' (FORMAT PARQUET);`);
    await this.exec(`COPY ledger_entities TO '${path.join(outDir, "ledger_entities.parquet")}' (FORMAT PARQUET);`);
  }

  // ---- duckdb helpers ----

  private async exec(sql: string): Promise<void> {
    await this.db.exec(sql);
  }

  private async run(sql: string, params: any[] = []): Promise<void> {
    const stmt = await this.db.prepare(sql);
    await stmt.run(...params);
    await stmt.finalize();
  }

  private async getOne<T>(sql: string, params: any[] = []): Promise<T | null> {
    const stmt = await this.db.prepare(sql);
    const rows = await stmt.all(...params);
    await stmt.finalize();
    return (rows[0] as T) ?? null;
  }

  async queryAll<T>(sql: string, params: any[] = []): Promise<T[]> {
    const stmt = await this.db.prepare(sql);
    const rows = await stmt.all(...params);
    await stmt.finalize();
    return rows as T[];
  }
}
