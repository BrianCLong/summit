"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvidenceStore = void 0;
const hash_js_1 = require("../utils/hash.js");
const stable_json_js_1 = require("../utils/stable-json.js");
class EvidenceStore {
    events = [];
    policyDecisions = [];
    toolSchemas = [];
    recordEvent(event) {
        this.events = [...this.events, event].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    }
    recordPolicy(decision) {
        this.policyDecisions = [...this.policyDecisions, decision];
    }
    recordToolSchema(entry) {
        const exists = this.toolSchemas.some((schema) => schema.id === entry.id);
        if (!exists) {
            this.toolSchemas = [...this.toolSchemas, entry].sort((a, b) => a.id.localeCompare(b.id));
        }
    }
    exportBundle(sessionId) {
        const stepsHash = (0, hash_js_1.hashJson)((0, stable_json_js_1.stableSortValue)(this.events));
        const policyHash = (0, hash_js_1.hashJson)((0, stable_json_js_1.stableSortValue)(this.policyDecisions));
        const toolSchemasHash = (0, hash_js_1.hashJson)((0, stable_json_js_1.stableSortValue)(this.toolSchemas));
        const manifest = {
            sessionId,
            generatedAt: new Date().toISOString(),
            toolSchemasHash,
            stepsHash,
            policyHash,
        };
        const checksums = {
            manifest: (0, hash_js_1.hashJson)(manifest),
            steps: stepsHash,
            policyDecisions: policyHash,
            toolSchemasUsed: toolSchemasHash,
        };
        return {
            manifest,
            steps: this.events,
            toolSchemasUsed: this.toolSchemas,
            policyDecisions: this.policyDecisions,
            checksums,
        };
    }
}
exports.EvidenceStore = EvidenceStore;
