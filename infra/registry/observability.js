"use strict";
/**
 * Lightweight observability helpers for registry verification tools
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitVerificationTelemetry = emitVerificationTelemetry;
const crypto_1 = require("crypto");
const api_1 = require("@opentelemetry/api");
function hashValue(value) {
    if (!value)
        return undefined;
    return (0, crypto_1.createHash)('sha256').update(value).digest('hex');
}
function emitVerificationTelemetry(telemetry) {
    const tracer = api_1.trace.getTracer('registry-tools');
    const span = tracer.startSpan(`supplychain.${telemetry.stage}`, {
        attributes: {
            'supplychain.actor': telemetry.actor ?? 'unknown',
            'supplychain.digest': telemetry.digest ?? 'unknown',
            'supplychain.image_ref': telemetry.imageRef ?? 'unknown',
            'supplychain.commit': telemetry.commit ?? 'unknown',
            'supplychain.rekor_uuid': telemetry.rekorUuid ?? 'absent',
            'supplychain.sbom_hash': telemetry.sbomHash ?? 'absent',
            'policy.allowed': telemetry.policyOutcome.allowed,
            'policy.summary': telemetry.policyOutcome.summary ?? 'n/a',
        },
    });
    if (!telemetry.policyOutcome.allowed) {
        span.setStatus({
            code: api_1.SpanStatusCode.ERROR,
            message: telemetry.policyOutcome.summary ?? 'policy-blocked',
        });
    }
    span.end();
    const logPayload = {
        ts: new Date().toISOString(),
        event: 'supplychain.verify',
        ...telemetry,
        sbomHash: telemetry.sbomHash ? hashValue(telemetry.sbomHash) : undefined,
        metadata: telemetry.metadata ?? {},
    };
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(logPayload));
}
