"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MulLedgerSdk = exports.ModelUsageLedger = void 0;
exports.createLedgerRouter = createLedgerRouter;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const node_crypto_1 = require("node:crypto");
const node_perf_hooks_1 = require("node:perf_hooks");
const express_1 = __importDefault(require("express"));
class ModelUsageLedger {
    db;
    insertStatement;
    headStatement;
    monthStatement;
    constructor(path = ':memory:') {
        this.db = new better_sqlite3_1.default(path);
        this.db.pragma('journal_mode = WAL');
        this.initialize();
        this.insertStatement = this.db.prepare(`
      INSERT INTO ledger_entries (
        event_id,
        timestamp,
        model,
        version,
        dataset_lineage_id,
        consent_scope,
        dp_budget_spend,
        policy_hash,
        output_artifact_ids,
        previous_hash,
        entry_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        this.headStatement = this.db.prepare('SELECT entry_hash AS hash FROM ledger_entries ORDER BY sequence DESC LIMIT 1');
        this.monthStatement = this.db.prepare(`
      SELECT
        sequence,
        event_id,
        timestamp,
        model,
        version,
        dataset_lineage_id AS datasetLineageId,
        consent_scope AS consentScope,
        dp_budget_spend AS dpBudgetSpend,
        policy_hash AS policyHash,
        output_artifact_ids AS outputArtifactIds,
        previous_hash AS previousHash,
        entry_hash AS hash
      FROM ledger_entries
      WHERE timestamp >= ? AND timestamp < ?
      ORDER BY sequence ASC
    `);
    }
    initialize() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS ledger_entries (
        sequence INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id TEXT NOT NULL UNIQUE,
        timestamp TEXT NOT NULL,
        model TEXT NOT NULL,
        version TEXT NOT NULL,
        dataset_lineage_id TEXT NOT NULL,
        consent_scope TEXT NOT NULL,
        dp_budget_spend REAL NOT NULL,
        policy_hash TEXT NOT NULL,
        output_artifact_ids TEXT NOT NULL,
        previous_hash TEXT,
        entry_hash TEXT NOT NULL
      );
    `);
    }
    appendEvent(event) {
        const timestamp = normaliseTimestamp(event.timestamp);
        const eventId = event.eventId ?? (0, node_crypto_1.randomUUID)();
        const previousHash = this.getHeadHash();
        const hash = computeHash({
            eventId,
            timestamp,
            model: event.model,
            version: event.version,
            datasetLineageId: event.datasetLineageId,
            consentScope: event.consentScope,
            dpBudgetSpend: event.dpBudgetSpend,
            policyHash: event.policyHash,
            outputArtifactIds: event.outputArtifactIds,
            previousHash: previousHash ?? undefined
        });
        const payloadJson = JSON.stringify(event.outputArtifactIds ?? []);
        const info = this.insertStatement.run(eventId, timestamp, event.model, event.version, event.datasetLineageId, event.consentScope, event.dpBudgetSpend, event.policyHash, payloadJson, previousHash ?? null, hash);
        return {
            model: event.model,
            version: event.version,
            datasetLineageId: event.datasetLineageId,
            consentScope: event.consentScope,
            dpBudgetSpend: event.dpBudgetSpend,
            policyHash: event.policyHash,
            outputArtifactIds: [...event.outputArtifactIds],
            eventId,
            timestamp,
            previousHash: previousHash ?? null,
            hash,
            sequence: Number(info.lastInsertRowid)
        };
    }
    getHeadHash() {
        const result = this.headStatement.get();
        return result?.hash ?? null;
    }
    queryEvents(options = {}) {
        const clauses = [];
        const params = [];
        if (options.model) {
            clauses.push('model = ?');
            params.push(options.model);
        }
        if (options.datasetLineageId) {
            clauses.push('dataset_lineage_id = ?');
            params.push(options.datasetLineageId);
        }
        if (options.policyHash) {
            clauses.push('policy_hash = ?');
            params.push(options.policyHash);
        }
        if (options.after) {
            clauses.push('timestamp > ?');
            params.push(options.after);
        }
        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
        const limit = options.limit && options.limit > 0 ? options.limit : 200;
        const statement = this.db.prepare(`SELECT sequence, event_id, timestamp, model, version, dataset_lineage_id, consent_scope, dp_budget_spend, policy_hash, output_artifact_ids, previous_hash, entry_hash FROM ledger_entries ${where} ORDER BY sequence DESC LIMIT ?`);
        const rows = statement.all(...params, limit);
        return rows.map(mapRow);
    }
    verifyIntegrity() {
        const rows = this.db
            .prepare(`SELECT sequence, event_id, timestamp, model, version, dataset_lineage_id, consent_scope, dp_budget_spend, policy_hash, output_artifact_ids, previous_hash, entry_hash FROM ledger_entries ORDER BY sequence ASC`)
            .all();
        let previousHash = null;
        for (let index = 0; index < rows.length; index += 1) {
            const row = rows[index];
            if (row.previous_hash !== previousHash) {
                return {
                    ok: false,
                    failure: {
                        index,
                        eventId: row.event_id,
                        reason: 'PREVIOUS_HASH_MISMATCH'
                    }
                };
            }
            const recalculated = computeHash({
                eventId: row.event_id,
                timestamp: row.timestamp,
                model: row.model,
                version: row.version,
                datasetLineageId: row.dataset_lineage_id,
                consentScope: row.consent_scope,
                dpBudgetSpend: row.dp_budget_spend,
                policyHash: row.policy_hash,
                outputArtifactIds: JSON.parse(row.output_artifact_ids),
                previousHash: row.previous_hash ?? undefined
            });
            if (recalculated !== row.entry_hash) {
                return {
                    ok: false,
                    failure: {
                        index,
                        eventId: row.event_id,
                        reason: 'HASH_MISMATCH'
                    }
                };
            }
            previousHash = row.entry_hash;
        }
        return { ok: true };
    }
    exportMonthlyCompliancePack(month, signer) {
        const { start, end } = monthRange(month);
        const rows = this.monthStatement.all(start, end);
        const events = rows.map(mapRow);
        const totals = events.reduce((agg, row) => ({
            events: agg.events + 1,
            dpBudgetSpend: agg.dpBudgetSpend + row.dpBudgetSpend
        }), { events: 0, dpBudgetSpend: 0 });
        const digest = hashEvents(events);
        const pack = {
            month,
            generatedAt: new Date().toISOString(),
            headHash: events.at(-1)?.hash ?? this.getHeadHash(),
            totals,
            digest,
            events
        };
        const payload = JSON.stringify(pack);
        const signature = signPayload(payload, signer);
        return {
            pack,
            signature,
            payload
        };
    }
}
exports.ModelUsageLedger = ModelUsageLedger;
class MulLedgerSdk {
    ledger;
    constructor(ledger) {
        this.ledger = ledger;
    }
    logEvent(event) {
        return this.ledger.appendEvent(event);
    }
    benchmark(iterations = 100, factory) {
        const samples = [];
        for (let index = 0; index < iterations; index += 1) {
            const start = node_perf_hooks_1.performance.now();
            this.logEvent(factory ? factory() : defaultEvent());
            const duration = node_perf_hooks_1.performance.now() - start;
            samples.push(duration);
        }
        return samples.reduce((sum, value) => sum + value, 0) / samples.length;
    }
}
exports.MulLedgerSdk = MulLedgerSdk;
function createLedgerRouter(ledger, options) {
    const router = express_1.default.Router();
    router.use(express_1.default.json());
    router.post('/events', (req, res) => {
        const record = ledger.appendEvent(req.body);
        res.status(201).json(record);
    });
    router.get('/events', (req, res) => {
        const events = ledger.queryEvents({
            model: req.query.model,
            datasetLineageId: req.query.datasetLineageId,
            policyHash: req.query.policyHash,
            limit: req.query.limit ? Number(req.query.limit) : undefined,
            after: req.query.after
        });
        res.json({ events });
    });
    router.get('/integrity', (req, res) => {
        const result = ledger.verifyIntegrity();
        if (result.ok) {
            res.json({ ok: true });
            return;
        }
        res.status(409).json(result);
    });
    router.get('/compliance-pack', (req, res) => {
        const { month } = req.query;
        if (!month || typeof month !== 'string') {
            res.status(400).json({ error: 'month query param required' });
            return;
        }
        const pack = ledger.exportMonthlyCompliancePack(month, options.signer);
        res.json(pack);
    });
    return router;
}
function normaliseTimestamp(value) {
    if (value) {
        return new Date(value).toISOString();
    }
    return new Date().toISOString();
}
function computeHash(data) {
    const hash = (0, node_crypto_1.createHash)('sha256');
    hash.update(data.eventId);
    hash.update(data.timestamp);
    hash.update(data.model);
    hash.update(data.version);
    hash.update(data.datasetLineageId);
    hash.update(data.consentScope);
    hash.update(String(data.dpBudgetSpend));
    hash.update(data.policyHash);
    hash.update(JSON.stringify(data.outputArtifactIds));
    if (data.previousHash) {
        hash.update(data.previousHash);
    }
    return hash.digest('hex');
}
function mapRow(row) {
    return {
        eventId: row.event_id ?? row.eventId,
        timestamp: row.timestamp,
        model: row.model,
        version: row.version,
        datasetLineageId: row.datasetLineageId ?? row.dataset_lineage_id,
        consentScope: row.consentScope ?? row.consent_scope,
        dpBudgetSpend: Number(row.dpBudgetSpend ?? row.dp_budget_spend),
        policyHash: row.policyHash ?? row.policy_hash,
        outputArtifactIds: Array.isArray(row.outputArtifactIds)
            ? row.outputArtifactIds
            : JSON.parse(row.output_artifact_ids ?? row.outputArtifactIds ?? '[]'),
        previousHash: row.previousHash ?? row.previous_hash ?? null,
        hash: row.hash ?? row.entry_hash,
        sequence: Number(row.sequence)
    };
}
function monthRange(month) {
    const [year, monthPart] = month.split('-').map(Number);
    if (!year || !monthPart || monthPart < 1 || monthPart > 12) {
        throw new Error(`Invalid month format: ${month}`);
    }
    const start = new Date(Date.UTC(year, monthPart - 1, 1));
    const end = new Date(Date.UTC(year, monthPart, 1));
    return { start: start.toISOString(), end: end.toISOString() };
}
function hashEvents(events) {
    const hash = (0, node_crypto_1.createHash)('sha256');
    hash.update(JSON.stringify(events));
    return hash.digest('hex');
}
function signPayload(payload, signer) {
    const algorithm = signer.algorithm ?? 'HS256';
    if (algorithm === 'HS256') {
        const value = (0, node_crypto_1.createHmac)('sha256', signer.secret).update(payload).digest('hex');
        return {
            algorithm,
            keyId: signer.keyId,
            value
        };
    }
    const value = (0, node_crypto_1.createHash)('sha256').update(payload).digest('hex');
    return {
        algorithm,
        keyId: signer.keyId,
        value
    };
}
function defaultEvent() {
    return {
        model: 'default-model',
        version: '1.0.0',
        datasetLineageId: 'ds-1',
        consentScope: 'general',
        dpBudgetSpend: 0,
        policyHash: 'policy',
        outputArtifactIds: []
    };
}
