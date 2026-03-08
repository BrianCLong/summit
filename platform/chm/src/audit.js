"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditReceiptService = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
class AuditReceiptService {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async record(receipt) {
        const client = await this.pool.connect();
        try {
            await client.query(`INSERT INTO chm.audit_receipts (id, document_id, actor, action, payload, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`, [
                receipt.id,
                receipt.documentId,
                receipt.actor,
                receipt.action,
                JSON.stringify(receipt.payload),
                receipt.createdAt.toISOString()
            ]);
        }
        finally {
            client.release();
        }
    }
    async recordExport(documentId, context, decision) {
        const receipt = {
            id: node_crypto_1.default.randomUUID(),
            documentId,
            actor: context.actorId,
            action: decision.allowed ? 'export.allowed' : 'export.blocked',
            payload: { context, decision },
            createdAt: new Date()
        };
        await this.record(receipt);
        return receipt;
    }
    async recordTag(tag, action, actor) {
        const receipt = {
            id: node_crypto_1.default.randomUUID(),
            documentId: tag.documentId,
            actor,
            action,
            payload: tag,
            createdAt: new Date()
        };
        await this.record(receipt);
        return receipt;
    }
}
exports.AuditReceiptService = AuditReceiptService;
