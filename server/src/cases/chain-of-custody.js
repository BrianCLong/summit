"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChainOfCustodyService = void 0;
exports.writeCoC = writeCoC;
exports.verifyChain = verifyChain;
const node_crypto_1 = require("node:crypto");
const logger_js_1 = __importDefault(require("../config/logger.js"));
const ledger_js_1 = require("../provenance/ledger.js");
const moduleLogger = logger_js_1.default.child({ module: 'chain-of-custody' });
const encodeBuffer = (value, encoding) => Buffer.from(value).toString(encoding);
class ChainOfCustodyService {
    pg;
    ledger;
    constructor(pg) {
        this.pg = pg;
        this.ledger = new ledger_js_1.ProvenanceLedgerV2();
    }
    async recordEvent(event) {
        const timestamp = new Date();
        const id = (0, node_crypto_1.randomUUID)();
        // 1. Store in SQL for querying
        await this.pg.query(`INSERT INTO maestro.chain_of_custody_events
       (id, case_id, evidence_id, action, actor_id, timestamp, location, notes, verification_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [id, event.caseId, event.evidenceId, event.action, event.actorId, timestamp, event.location, event.notes, event.verificationHash]);
        // 2. Append to Provenance Ledger for immutability
        await this.ledger.appendEntry({
            tenantId: 'system',
            actionType: 'CUSTODY_EVENT',
            resourceType: 'Evidence',
            resourceId: event.evidenceId,
            actorId: event.actorId,
            actorType: 'user',
            timestamp: new Date(),
            payload: {
                mutationType: 'UPDATE',
                entityId: event.evidenceId,
                entityType: 'Evidence',
                caseId: event.caseId,
                action: event.action,
                location: event.location,
                notes: event.notes
            },
            metadata: {
                caseId: event.caseId,
                action: event.action,
                location: event.location,
                notes: event.notes
            }
        });
        moduleLogger.info({ eventId: id, evidenceId: event.evidenceId, action: event.action }, 'Chain of custody event recorded');
        return {
            id,
            timestamp,
            ...event
        };
    }
    async getChain(evidenceId) {
        const result = await this.pg.query(`SELECT * FROM maestro.chain_of_custody_events WHERE evidence_id = $1 ORDER BY timestamp ASC`, [evidenceId]);
        return result.rows.map((row) => ({
            id: row.id,
            caseId: row.case_id,
            evidenceId: row.evidence_id,
            action: row.action,
            actorId: row.actor_id,
            timestamp: row.timestamp,
            location: row.location,
            notes: row.notes,
            verificationHash: row.verification_hash
        }));
    }
    /**
     * List all evidence IDs associated with a case
     */
    async listEvidence(caseId) {
        const result = await this.pg.query(`SELECT DISTINCT evidence_id, MAX(timestamp) as last_update
       FROM maestro.chain_of_custody_events
       WHERE case_id = $1
       GROUP BY evidence_id`, [caseId]);
        return result.rows.map((row) => ({
            id: row.evidence_id,
            lastUpdate: row.last_update,
        }));
    }
    async verifyIntegrity(evidenceId) {
        // Cross-check SQL records against Provenance Ledger
        // Real implementation would verify Merkle proofs from the Ledger
        return true;
    }
}
exports.ChainOfCustodyService = ChainOfCustodyService;
/**
 * Append a custody event to the chain with an Ed25519 signature.
 * Returns the computed event hash which should be used as the next prevHash.
 * @deprecated Use ChainOfCustodyService.recordEvent
 */
async function writeCoC(db, event, prevHash, privateKey) {
    const payload = JSON.stringify(event);
    const eventHash = (0, node_crypto_1.createHash)('sha256')
        .update(prevHash + payload)
        .digest('hex');
    const signature = encodeBuffer((0, node_crypto_1.sign)(null, Buffer.from(eventHash), privateKey), 'base64');
    await db.custodyEvent.create({
        data: { ...event, prevHash, eventHash, signature },
    });
    return eventHash;
}
/**
 * Verify a chain of custody events. Returns true if the chain is intact and
 * signatures are valid.
 * @deprecated Use ChainOfCustodyService.verifyIntegrity
 */
function verifyChain(events, publicKey) {
    let prevHash = 'GENESIS';
    for (const e of events) {
        const { caseId, attachmentId, actorId, action, at, payload } = e;
        const payloadStr = JSON.stringify({
            caseId,
            attachmentId,
            actorId,
            action,
            at,
            payload,
        });
        const hash = (0, node_crypto_1.createHash)('sha256')
            .update(prevHash + payloadStr)
            .digest('hex');
        if (hash !== e.eventHash)
            return false;
        const ok = (0, node_crypto_1.verify)(null, Buffer.from(e.eventHash), publicKey, Buffer.from(e.signature, 'base64'));
        if (!ok)
            return false;
        prevHash = e.eventHash;
    }
    return true;
}
