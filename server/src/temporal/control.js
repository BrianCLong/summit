"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setTemporalHandle = setTemporalHandle;
exports.enableTemporal = enableTemporal;
exports.disableTemporal = disableTemporal;
const index_js_1 = require("./index.js");
let handle = null;
function setTemporalHandle(h) {
    handle = h;
}
async function enableTemporal() {
    if (process.env.TEMPORAL_ENABLED === 'true')
        return { ok: true, message: 'already enabled' };
    process.env.TEMPORAL_ENABLED = 'true';
    handle = await (0, index_js_1.startTemporalWorker)();
    return { ok: true };
}
async function disableTemporal() {
    if (process.env.TEMPORAL_ENABLED !== 'true')
        return { ok: true, message: 'already disabled' };
    process.env.TEMPORAL_ENABLED = 'false';
    try {
        await handle?.stop();
    }
    catch { }
    handle = null;
    return { ok: true };
}
