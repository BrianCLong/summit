"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.historyMiddleware = void 0;
const immer_1 = require("immer");
const historySlice_1 = require("./historySlice");
const audit_1 = require("../../telemetry/audit"); // stub below
const otel_1 = require("../../telemetry/otel"); // stub below
(0, immer_1.enablePatches)();
const ALLOW = new Set([
    'viewSync/setTimeRange',
    'viewSync/setGeoBounds',
    'viewSync/setSelectedNodeIds',
    'codex/addSection',
    'codex/addCard',
    'codex/moveCard',
    'codex/setRedaction',
    'focus/enterFocus',
    'focus/exitFocus',
    'settings/setAnimationMode',
]);
const historyMiddleware = store => next => (action) => {
    if (action.type === 'history/undo') {
        return undo(store);
    }
    if (action.type === 'history/redo') {
        return redo(store);
    }
    if (!ALLOW.has(action.type)) {
        return next(action);
    }
    const prev = store.getState();
    const [nextState, patches, inverse] = (0, immer_1.produceWithPatches)(prev, (draft) => {
        // replay the action against the draft state
        // We call `next(action)` after, but we need patches now; so we mirror reducer invocation:
    });
    // Because Redux reducers run in store, we will capture by re-dispatching and diffing:
    const before = store.getState();
    const result = next(action);
    const after = store.getState();
    const diffs = diffState(before, after); // Lightweight JSON diff → Patch[]
    const inverses = invertPatches(diffs); // Minimal inverse set
    store.dispatch((0, historySlice_1.push)({
        label: action.type,
        patches: diffs,
        inverse: inverses,
        ts: new Date().toISOString(),
    }));
    (0, audit_1.recordAudit)('ui.history.mutate', { action: action.type });
    return result;
};
exports.historyMiddleware = historyMiddleware;
// Minimal diff/invert shims (replace with robust impl or library if approved)
function diffState(a, b) {
    // naive shallow + slice-specific diff; expand as needed
    // For S1, capture allowlisted slice roots
    const paths = [['viewSync'], ['codex'], ['focus'], ['settings']];
    const patches = [];
    for (const p of paths) {
        const ka = JSON.stringify(valueAt(a, p));
        const kb = JSON.stringify(valueAt(b, p));
        if (ka !== kb) {
            patches.push({
                op: 'replace',
                path: `/${p.join('/')}`,
                value: valueAt(b, p),
            });
        }
    }
    return patches;
}
function invertPatches(patches) {
    return patches.map(p => ({ op: 'replace', path: p.path, value: null })); // filled at apply-time using snapshot
}
function valueAt(obj, path) {
    return path.reduce((o, k) => o?.[k], obj);
}
function undo(store) {
    return (0, otel_1.withSpan)('ui.undo.apply', () => {
        const entry = store.getState().history.undo.at(-1);
        if (!entry) {
            return;
        }
        store.dispatch((0, historySlice_1.popUndo)());
        const snap = store.getState(); // capture snapshot to compute inverses
        const state = (0, immer_1.applyPatches)(snap, entry.inverse);
        store.replaceReducer((_) => state); // synchronous state swap (dev-only shim)
        store.dispatch((0, historySlice_1.moveToRedo)(entry));
        (0, audit_1.recordAudit)('ui.history.undo', { label: entry.label });
    });
}
function redo(store) {
    return (0, otel_1.withSpan)('ui.redo.apply', () => {
        const entry = store.getState().history.redo.at(-1);
        if (!entry) {
            return;
        }
        store.dispatch((0, historySlice_1.popRedo)());
        const snap = store.getState();
        const state = (0, immer_1.applyPatches)(snap, entry.patches);
        store.replaceReducer((_) => state);
        store.dispatch((0, historySlice_1.moveToUndo)(entry));
        (0, audit_1.recordAudit)('ui.history.redo', { label: entry.label });
    });
}
