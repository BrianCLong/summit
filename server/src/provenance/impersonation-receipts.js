"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordImpersonationReceipt = recordImpersonationReceipt;
const crypto_1 = __importDefault(require("crypto"));
const ledger_js_1 = require("./ledger.js");
const receipt_js_1 = require("../maestro/evidence/receipt.js");
async function recordImpersonationReceipt(params) {
    const ledger = ledger_js_1.ProvenanceLedgerV2.getInstance();
    const createdAt = new Date().toISOString();
    const inputPayload = {
        action: params.action,
        sessionId: params.sessionId,
        actor: params.actor,
        target: params.target,
        justification: params.justification,
        policyId: params.policy.id,
        policyDecisionId: params.policy.decisionId,
        createdAt,
    };
    const entry = await ledger.appendEntry({
        tenantId: params.actor.tenantId,
        timestamp: new Date(createdAt),
        actionType: params.action === 'start' ? 'IMPERSONATION_START' : 'IMPERSONATION_STOP',
        resourceType: 'SupportImpersonationSession',
        resourceId: params.sessionId,
        actorId: params.actor.id,
        actorType: 'user',
        payload: {
            mutationType: params.action === 'start' ? 'CREATE' : 'UPDATE',
            entityId: params.sessionId,
            entityType: 'SupportImpersonationSession',
            ...inputPayload,
        },
        metadata: {
            complianceReview: true,
            policyId: params.policy.id,
            policyDecisionId: params.policy.decisionId,
            ...params.metadata,
        },
    });
    const signerInfo = (0, receipt_js_1.resolveSigningSecret)();
    const inputHash = (0, receipt_js_1.hashCanonical)(inputPayload);
    const receiptId = crypto_1.default.randomUUID();
    const baseReceipt = {
        receiptId,
        action: params.action,
        sessionId: params.sessionId,
        createdAt,
        codeDigest: (0, receipt_js_1.getCodeDigest)(),
        actor: params.actor,
        target: params.target,
        inputHash,
        policy: {
            id: params.policy.id,
            decisionId: params.policy.decisionId,
            outcome: params.policy.allow ? 'ALLOW' : 'DENY',
        },
        provenanceEntryId: entry.id,
        signer: { kid: signerInfo.kid, alg: signerInfo.alg },
    };
    const signature = (0, receipt_js_1.signReceiptPayload)(baseReceipt, signerInfo.secret);
    return {
        ...baseReceipt,
        signature,
    };
}
