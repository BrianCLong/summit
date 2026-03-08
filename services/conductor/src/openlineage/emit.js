"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitOL = emitOL;
function emitOL({ runId, stepId, when, type, inputs, outputs, }) {
    const ev = {
        eventType: type,
        eventTime: when.toISOString(),
        run: { facets: { runId } },
        job: { namespace: 'maestro', name: 'conductor', facets: { stepId } },
        inputs,
        outputs,
    };
    fetch(process.env.OL_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(ev),
    }).catch(() => { });
}
