"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCaseContext = exports.recordRlsOverhead = exports.getRlsContext = exports.runWithRlsContext = exports.isRlsFeatureFlagEnabled = void 0;
const async_hooks_1 = require("async_hooks");
const rlsStorage = new async_hooks_1.AsyncLocalStorage();
const isRlsFeatureFlagEnabled = () => process.env.RLS_V1 === '1';
exports.isRlsFeatureFlagEnabled = isRlsFeatureFlagEnabled;
const runWithRlsContext = (context, fn) => rlsStorage.run(context, fn);
exports.runWithRlsContext = runWithRlsContext;
const getRlsContext = () => rlsStorage.getStore();
exports.getRlsContext = getRlsContext;
const recordRlsOverhead = (durationMs) => {
    const ctx = rlsStorage.getStore();
    if (!ctx)
        return;
    ctx.overheadMs = (ctx.overheadMs || 0) + durationMs;
};
exports.recordRlsOverhead = recordRlsOverhead;
const updateCaseContext = (caseId) => {
    const ctx = rlsStorage.getStore();
    if (!ctx || !caseId)
        return;
    ctx.caseId = caseId;
};
exports.updateCaseContext = updateCaseContext;
