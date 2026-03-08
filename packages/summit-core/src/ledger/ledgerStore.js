"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LedgerStore = void 0;
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const duckdb_async_1 = require("duckdb-async");
class LedgerStore {
    opts;
    db;
    constructor(opts) {
        this.opts = opts;
        const dir = node_path_1.default.dirname(opts.dbPath);
        node_fs_1.default.mkdirSync(dir, { recursive: true });
    }
    async init() {
        this.db = await duckdb_async_1.Database.create(this.opts.dbPath);
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
    async appendWriteSet(ws) {
        const oldToNewId = new Map();
        for (const a of ws.artifacts) {
            if (!a.artifact_id || a.artifact_id.startsWith("TEMP_")) {
                const oldId = a.artifact_id;
                a.artifact_id = node_crypto_1.default.createHash("sha256").update(a.uri + a.observed_at + (a.sha256 || "")).digest("hex");
                if (oldId)
                    oldToNewId.set(oldId, a.artifact_id);
            }
        }
        for (const c of ws.claims) {
            if (!c.claim_id || c.claim_id.startsWith("TEMP_")) {
                const oldId = c.claim_id;
                c.claim_id = node_crypto_1.default.createHash("sha256").update(c.statement + c.valid_time.start + (c.topic || "")).digest("hex");
                if (oldId)
                    oldToNewId.set(oldId, c.claim_id);
            }
        }
        // Update links to use newly generated IDs
        for (const l of ws.links) {
            if (oldToNewId.has(l.from)) {
                l.from = oldToNewId.get(l.from);
            }
            if (oldToNewId.has(l.to)) {
                l.to = oldToNewId.get(l.to);
            }
        }
        const raw = JSON.stringify(ws);
        const sha256 = node_crypto_1.default.createHash("sha256").update(raw).digest("hex");
        // Basic immutability: stable ID must not be reused
        const exists = await this.getOne(`SELECT COUNT(*)::INT as c FROM ledger_writesets WHERE writeset_id = ?`, [ws.writeset_id]);
        if (exists?.c && exists.c > 0) {
            throw new Error(`writeset_id already exists (append-only): ${ws.writeset_id}`);
        }
        await this.run(`INSERT INTO ledger_writesets(writeset_id, tx_time, sha256, provenance_json, writeset_json)
       VALUES (?, ?, ?, ?, ?)`, [ws.writeset_id, ws.tx_time, sha256, JSON.stringify(ws.provenance), raw]);
        for (const a of ws.artifacts) {
            await this.run(`INSERT INTO ledger_artifacts VALUES (?, ?, ?, ?, ?, ?, ?)`, [ws.writeset_id, a.artifact_id, a.kind, a.uri, a.observed_at, a.content_type ?? null, a.sha256 ?? null]);
        }
        for (const c of ws.claims) {
            await this.run(`INSERT INTO ledger_claims VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                ws.writeset_id,
                c.claim_id,
                c.statement,
                c.topic ?? null,
                c.valid_time.start,
                c.valid_time.end ?? null,
                c.confidence.score,
                c.confidence.method ?? null,
                c.confidence.rationale ?? null
            ]);
        }
        for (const l of ws.links) {
            await this.run(`INSERT INTO ledger_links VALUES (?, ?, ?, ?, ?)`, [ws.writeset_id, l.from, l.to, l.type, l.weight ?? null]);
        }
        for (const e of ws.entities ?? []) {
            await this.run(`INSERT INTO ledger_entities VALUES (?, ?, ?, ?)`, [ws.writeset_id, e.entity_id, e.label, e.kind]);
        }
        return { writeset_id: ws.writeset_id, sha256 };
    }
    /**
     * Export tables to Parquet (optional).
     * This is “foundation” for scalable lakehouse later.
     */
    async exportParquet(outDir) {
        node_fs_1.default.mkdirSync(outDir, { recursive: true });
        await this.exec(`COPY ledger_writesets TO '${node_path_1.default.join(outDir, "ledger_writesets.parquet")}' (FORMAT PARQUET);`);
        await this.exec(`COPY ledger_artifacts TO '${node_path_1.default.join(outDir, "ledger_artifacts.parquet")}' (FORMAT PARQUET);`);
        await this.exec(`COPY ledger_claims TO '${node_path_1.default.join(outDir, "ledger_claims.parquet")}' (FORMAT PARQUET);`);
        await this.exec(`COPY ledger_links TO '${node_path_1.default.join(outDir, "ledger_links.parquet")}' (FORMAT PARQUET);`);
        await this.exec(`COPY ledger_entities TO '${node_path_1.default.join(outDir, "ledger_entities.parquet")}' (FORMAT PARQUET);`);
    }
    // ---- duckdb helpers ----
    async exec(sql) {
        await this.db.exec(sql);
    }
    async run(sql, params = []) {
        const stmt = await this.db.prepare(sql);
        await stmt.run(...params);
        await stmt.finalize();
    }
    async getOne(sql, params = []) {
        const stmt = await this.db.prepare(sql);
        const rows = await stmt.all(...params);
        await stmt.finalize();
        return rows[0] ?? null;
    }
    async queryAll(sql, params = []) {
        const stmt = await this.db.prepare(sql);
        const rows = await stmt.all(...params);
        await stmt.finalize();
        return rows;
    }
}
exports.LedgerStore = LedgerStore;
