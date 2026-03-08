"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitTransitionReceipt = exports.buildTransitionReceipt = void 0;
const crypto_1 = __importDefault(require("crypto"));
const receipt_js_1 = require("./receipt.js");
const receipt_signing_js_1 = require("./receipt-signing.js");
const provenance_service_js_1 = require("./provenance-service.js");
const defaultPolicySet = () => process.env.MAESTRO_POLICY_SET || 'maestro.policy.guard.v1';
const buildTransitionReceipt = (input) => {
    const timestamp = new Date().toISOString();
    const baseReceipt = {
        spec_version: '1.0.0',
        id: crypto_1.default.randomUUID(),
        timestamp,
        correlation_id: input.correlationId || input.runId,
        tenant_id: input.tenantId,
        actor: input.actor,
        action: input.action,
        resource: input.resource,
        policy: {
            decision_id: input.policyDecisionId || crypto_1.default.randomUUID(),
            policy_set: input.policySet || defaultPolicySet(),
            evaluation_timestamp: input.policyTimestamp || timestamp,
        },
        result: input.result,
    };
    const signature = (0, receipt_signing_js_1.buildReceiptSignature)(baseReceipt);
    return {
        ...baseReceipt,
        signature,
    };
};
exports.buildTransitionReceipt = buildTransitionReceipt;
const emitTransitionReceipt = async (input) => {
    const receipt = (0, exports.buildTransitionReceipt)(input);
    const artifactId = await provenance_service_js_1.evidenceProvenanceService.storeEvidence({
        runId: input.runId,
        artifactType: 'receipt',
        content: (0, receipt_js_1.canonicalStringify)(receipt),
        metadata: {
            contentType: 'application/json',
            action: input.action,
            resourceType: input.resource.type,
            resourceId: input.resource.id,
            correlationId: receipt.correlation_id,
        },
    });
    return { receipt, artifactId };
};
exports.emitTransitionReceipt = emitTransitionReceipt;
