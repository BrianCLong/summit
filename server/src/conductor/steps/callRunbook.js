"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.callRunbookStep = callRunbookStep;
const start_js_1 = require("../start.js");
async function callRunbookStep(ctx, step) {
    const ref = step.inputs?.runbookRef || 'unknown';
    const child = await (0, start_js_1.startRun)({
        runbookRef: ref,
        parentRunId: ctx.id,
        labels: ctx.labels,
    });
    await (0, start_js_1.onRunComplete)(child.id, ctx.cancelToken);
    ctx.log?.('info', `callRunbook child completed: ${child.id}`);
}
