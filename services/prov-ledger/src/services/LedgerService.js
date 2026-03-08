"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LedgerService = void 0;
const hash_js_1 = require("../utils/hash.js");
const pg_1 = require("pg");
const crypto_1 = __importDefault(require("crypto"));
const pg_mem_1 = require("pg-mem");
class LedgerService {
    static instance;
    pool; // Using any to support both pg Pool and pg-mem adapter
    constructor() {
        if (process.env.NODE_ENV === 'test') {
            const db = (0, pg_mem_1.newDb)();
            const adapter = db.adapters.createPg();
            this.pool = new adapter.Pool();
        }
        else {
            this.pool = new pg_1.Pool({
                connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/provenance',
                max: 20,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 2000,
            });
        }
        this.initDB();
    }
    async initDB() {
        // Simple schema creation for prototype
        try {
            await this.pool.query(`
        CREATE TABLE IF NOT EXISTS ledger_entries (
          id TEXT PRIMARY KEY,
          case_id TEXT,
          type TEXT NOT NULL,
          data JSONB NOT NULL,
          previous_hash TEXT,
          hash TEXT NOT NULL,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          seq SERIAL
        );

        CREATE INDEX IF NOT EXISTS idx_ledger_seq ON ledger_entries(seq);
        CREATE INDEX IF NOT EXISTS idx_ledger_case ON ledger_entries(case_id);
      `);
        }
        catch (e) {
            console.error('InitDB Error:', e);
            throw e;
        }
    }
    static getInstance() {
        if (!LedgerService.instance) {
            LedgerService.instance = new LedgerService();
        }
        return LedgerService.instance;
    }
    // Exposed for testing to reset state
    async _reset() {
        await this.pool.query('TRUNCATE TABLE ledger_entries');
    }
    async getPreviousEntry(caseId) {
        let res;
        if (caseId) {
            res = await this.pool.query('SELECT hash FROM ledger_entries WHERE case_id = $1 ORDER BY seq DESC LIMIT 1', [caseId]);
        }
        else {
            res = await this.pool.query('SELECT hash FROM ledger_entries WHERE case_id IS NULL ORDER BY seq DESC LIMIT 1');
        }
        if (res.rows.length === 0)
            return null;
        return res.rows[0];
    }
    async appendEntry(type, id, data, caseId) {
        const previousEntry = await this.getPreviousEntry(caseId);
        const previousHash = previousEntry ? previousEntry.hash : null;
        // Hash payload: type + data + prevHash + caseId
        const entryPayload = {
            type,
            data,
            previousHash,
            caseId
        };
        const hash = (0, hash_js_1.calculateHash)(entryPayload);
        await this.pool.query('INSERT INTO ledger_entries (id, case_id, type, data, previous_hash, hash) VALUES ($1, $2, $3, $4, $5, $6)', [id, caseId || null, type, JSON.stringify(data), previousHash, hash]);
        return hash;
    }
    async registerEvidence(req) {
        const evidenceId = `ev_${crypto_1.default.randomUUID()}`;
        const evidence = {
            evidenceId,
            ...req,
            timestamp: new Date().toISOString()
        };
        await this.appendEntry('evidence', evidenceId, evidence, req.caseId);
        return evidenceId;
    }
    async registerTransform(req) {
        const transformId = `tx_${crypto_1.default.randomUUID()}`;
        const transform = {
            transformId,
            ...req,
            timestamp: new Date().toISOString()
        };
        await this.appendEntry('transform', transformId, transform, req.caseId);
        return transformId;
    }
    async registerClaim(req) {
        const claimId = `cl_${crypto_1.default.randomUUID()}`;
        const claim = {
            claimId,
            ...req,
            timestamp: new Date().toISOString()
        };
        await this.appendEntry('claim', claimId, claim, req.caseId);
        return claimId;
    }
    async getManifest(bundleId) {
        return this.getBundle(bundleId);
    }
    async getBundle(caseId) {
        const res = await this.pool.query('SELECT * FROM ledger_entries WHERE case_id = $1 ORDER BY seq ASC', [caseId]);
        if (res.rows.length === 0)
            return null;
        const entries = res.rows.map((row) => ({
            id: row.id,
            caseId: row.case_id,
            type: row.type,
            data: row.data,
            previousHash: row.previous_hash,
            hash: row.hash
        }));
        // The chain's integrity relies on the last hash
        const merkleRoot = entries[entries.length - 1].hash;
        return {
            bundleId: caseId,
            merkleRoot,
            entries
        };
    }
}
exports.LedgerService = LedgerService;
