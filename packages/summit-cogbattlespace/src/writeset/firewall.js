"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyCogWriteSet = applyCogWriteSet;
const src_1 = require("../../summit-schemas/src");
function ajvErrorsToItems(prefixCode, errors) {
    return (errors ?? []).map((error) => ({
        code: prefixCode,
        message: error.message ?? 'schema validation error',
        instancePath: error.instancePath,
        schemaPath: error.schemaPath,
        details: error.params ?? {},
    }));
}
function validatePayload(op) {
    const mapping = {
        Artifact: src_1.validators.artifact,
        Narrative: src_1.validators.narrative,
        Belief: src_1.validators.belief,
        NarrativeClaimLink: src_1.validators.narrativeClaimLink,
        BeliefClaimLink: src_1.validators.beliefClaimLink,
        NarrativeBeliefLink: src_1.validators.narrativeBeliefLink,
        DivergenceMetric: src_1.validators.divergenceMetric,
        BeliefGapMetric: src_1.validators.beliefGapMetric,
    };
    const validator = mapping[op.entityType];
    if (!validator) {
        return {
            ok: false,
            errors: [
                { code: 'UNKNOWN_ENTITY', message: `No validator registered for ${op.entityType}` },
            ],
        };
    }
    const valid = validator(op.payload);
    if (!valid) {
        return { ok: false, errors: ajvErrorsToItems('PAYLOAD_SCHEMA', validator.errors) };
    }
    return { ok: true };
}
function enforceDomainSeparation(ws, op) {
    const deny = ws.scope?.denyDomains ?? ['RG'];
    if (deny.includes('RG') && op.domain !== 'NG' && op.domain !== 'BG') {
        return {
            ok: false,
            errors: [{ code: 'DOMAIN_DENIED', message: `Domain ${op.domain} not allowed` }],
        };
    }
    const ngOnly = new Set([
        'Artifact',
        'Narrative',
        'NarrativeClaimLink',
        'DivergenceMetric',
    ]);
    const bgOnly = new Set([
        'Belief',
        'BeliefClaimLink',
        'NarrativeBeliefLink',
        'BeliefGapMetric',
    ]);
    if (ngOnly.has(op.entityType) && op.domain !== 'NG') {
        return {
            ok: false,
            errors: [{ code: 'DOMAIN_MISMATCH', message: `${op.entityType} must be NG` }],
        };
    }
    if (bgOnly.has(op.entityType) && op.domain !== 'BG') {
        return {
            ok: false,
            errors: [{ code: 'DOMAIN_MISMATCH', message: `${op.entityType} must be BG` }],
        };
    }
    return { ok: true };
}
async function applyCogWriteSet(store, ws) {
    const items = [];
    if (!src_1.validators.cogWriteSet(ws)) {
        return {
            ok: false,
            writesetId: ws.writesetId ?? 'unknown',
            summary: {
                receivedOps: ws.ops?.length ?? 0,
                acceptedOps: 0,
                rejectedOps: ws.ops?.length ?? 0,
            },
            items: [
                {
                    opId: 'ENVELOPE',
                    status: 'REJECTED',
                    errors: ajvErrorsToItems('ENVELOPE_SCHEMA', src_1.validators.cogWriteSet.errors),
                },
            ],
        };
    }
    const accepted = {
        Artifact: [],
        Narrative: [],
        Belief: [],
        NarrativeClaimLink: [],
        BeliefClaimLink: [],
        NarrativeBeliefLink: [],
        DivergenceMetric: [],
        BeliefGapMetric: [],
    };
    for (const op of ws.ops) {
        const base = {
            opId: op.opId,
            entityType: op.entityType,
            domain: op.domain,
            action: op.action,
        };
        if (!src_1.validators.cogOp(op)) {
            items.push({
                ...base,
                status: 'REJECTED',
                errors: ajvErrorsToItems('OP_SCHEMA', src_1.validators.cogOp.errors),
            });
            continue;
        }
        const separated = enforceDomainSeparation(ws, op);
        if (!separated.ok) {
            items.push({ ...base, status: 'REJECTED', errors: separated.errors });
            continue;
        }
        const payloadValidation = validatePayload(op);
        if (!payloadValidation.ok) {
            items.push({ ...base, status: 'REJECTED', errors: payloadValidation.errors });
            continue;
        }
        accepted[op.entityType].push(op.payload);
        items.push({ ...base, status: 'ACCEPTED' });
    }
    await store.putArtifacts(accepted.Artifact);
    await store.putNarratives(accepted.Narrative);
    await store.putBeliefs(accepted.Belief);
    await store.putLinks({
        narrativeClaim: accepted.NarrativeClaimLink,
        beliefClaim: accepted.BeliefClaimLink,
        narrativeBelief: accepted.NarrativeBeliefLink,
    });
    await store.putMetrics({
        divergence: accepted.DivergenceMetric,
        beliefGap: accepted.BeliefGapMetric,
    });
    const receivedOps = ws.ops.length;
    const acceptedOps = items.filter((item) => item.status === 'ACCEPTED').length;
    const rejectedOps = receivedOps - acceptedOps;
    return {
        ok: rejectedOps === 0,
        writesetId: ws.writesetId,
        summary: { receivedOps, acceptedOps, rejectedOps },
        items,
    };
}
