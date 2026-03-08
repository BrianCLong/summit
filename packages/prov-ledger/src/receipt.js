"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitDecisionReceipt = emitDecisionReceipt;
const primitives_1 = require("./primitives");
function emitDecisionReceipt(options) {
    const retries = options.retries ?? 0;
    const id = options.stepId ||
        `decision-${options.adapterId ? `${options.adapterId}-` : ''}${Date.now()}`;
    const receipt = {
        id,
        action: options.action,
        decision: options.decision,
        retries,
        obligations: options.obligations,
        digests: {
            subject: (0, primitives_1.hashJson)(options.subject),
            resource: (0, primitives_1.hashJson)(options.resource),
            context: (0, primitives_1.hashJson)(options.context),
        },
        adapterId: options.adapterId,
        issuedAt: new Date().toISOString(),
    };
    const step = (0, primitives_1.recordStep)(options.manifest, {
        id,
        type: 'policy-check',
        tool: options.tool || 'decision-receipt',
        params: {
            action: options.action,
            decision: options.decision,
            retries,
            adapterId: options.adapterId,
            obligations: options.obligations,
        },
        input: JSON.stringify({
            subject: options.subject,
            resource: options.resource,
            context: options.context,
        }),
        output: JSON.stringify(receipt),
        note: options.note,
    });
    return { receipt, step };
}
