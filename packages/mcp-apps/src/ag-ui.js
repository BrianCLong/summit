"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgUiBus = void 0;
const events_1 = require("events");
/**
 * AG-UI Compatible Event Bus
 * Streams tool lifecycle events and state deltas using SSE
 */
class AgUiBus extends events_1.EventEmitter {
    currentState = {};
    constructor() {
        super();
    }
    /**
     * Emit a TOOL_CALL_START event
     */
    emitToolStart(toolName, args, runId) {
        this.emitEvent({
            id: crypto.randomUUID(),
            type: 'TOOL_CALL_START',
            timestamp: new Date().toISOString(),
            payload: { toolName, args },
            runId
        });
    }
    /**
     * Update state and emit STATE_DELTA
     */
    updateState(newState, runId) {
        const patches = this.generatePatch(this.currentState, newState);
        if (patches.length > 0) {
            this.emitEvent({
                id: crypto.randomUUID(),
                type: 'STATE_DELTA',
                timestamp: new Date().toISOString(),
                payload: patches,
                runId
            });
        }
        this.currentState = structuredClone(newState);
    }
    /**
     * Emit a full STATE_SNAPSHOT
     */
    emitSnapshot(runId) {
        this.emitEvent({
            id: crypto.randomUUID(),
            type: 'STATE_SNAPSHOT',
            timestamp: new Date().toISOString(),
            payload: this.currentState,
            runId
        });
    }
    emitEvent(event) {
        this.emit('event', event);
    }
    /**
     * Minimal JSON Patch generator (RFC 6902-ish)
     * MVP status: Only handles simple object property changes.
     * Does not handle array indices or escaping special characters in pointers.
     */
    generatePatch(oldObj, newObj, path = '') {
        const patches = [];
        // This is a very basic implementation. In production, use a library like fast-json-patch.
        const oldKeys = Object.keys(oldObj || {});
        const newKeys = Object.keys(newObj || {});
        // Removed keys
        for (const key of oldKeys) {
            if (!(key in newObj)) {
                patches.push({ op: 'remove', path: `${path}/${key}` });
            }
        }
        // Added or changed keys
        for (const key of newKeys) {
            const oldVal = oldObj?.[key];
            const newVal = newObj[key];
            if (!(key in (oldObj || {}))) {
                patches.push({ op: 'add', path: `${path}/${key}`, value: newVal });
            }
            else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                if (typeof oldVal === 'object' && typeof newVal === 'object' && oldVal !== null && newVal !== null && !Array.isArray(newVal)) {
                    patches.push(...this.generatePatch(oldVal, newVal, `${path}/${key}`));
                }
                else {
                    patches.push({ op: 'replace', path: `${path}/${key}`, value: newVal });
                }
            }
        }
        return patches;
    }
}
exports.AgUiBus = AgUiBus;
