"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplianceEvaluator = void 0;
const node_crypto_1 = require("node:crypto");
const hashing_js_1 = require("./hashing.js");
class ComplianceEvaluator {
    opa;
    ledger;
    constructor(opa, ledger) {
        this.opa = opa;
        this.ledger = ledger;
    }
    async handleEvidence(evidence, nowIso) {
        const inputsHash = (0, hashing_js_1.sha256Hex)((0, hashing_js_1.canonicalJson)(evidence));
        const opaInput = {
            evidence,
            now: nowIso
        };
        let result = 'UNKNOWN';
        let reasons = [];
        try {
            const decision = await this.opa.evaluate(opaInput);
            if (decision.result?.allow === true) {
                result = 'PASS';
            }
            else if (decision.result?.allow === false) {
                result = 'FAIL';
            }
            if (decision.result?.decision) {
                result = decision.result.decision.result;
                reasons = decision.result.decision.reasons || [];
            }
        }
        catch (err) {
            result = 'UNKNOWN';
            reasons = [err.message];
        }
        const attestation = this.ledger.append({
            attestation_id: (0, node_crypto_1.randomUUID)(),
            control_id: evidence.control_id,
            result,
            evaluated_at: nowIso,
            inputs_hash: inputsHash,
            evidence_ref: {
                trace_id: evidence.trace_id,
                request_id: evidence.request_id
            },
            reasons
        });
        return attestation;
    }
}
exports.ComplianceEvaluator = ComplianceEvaluator;
