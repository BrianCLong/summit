"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeToolkitRecords = normalizeToolkitRecords;
exports.loadToolkitJson = loadToolkitJson;
const node_fs_1 = require("node:fs");
function normalizeToolkitRecords(records) {
    return [...records]
        .map((record) => ({
        ...record,
        categories: [...record.categories].sort((a, b) => a.localeCompare(b)),
        limitations: record.limitations ? [...record.limitations].sort((a, b) => a.localeCompare(b)) : undefined,
        evidence: { claim_ids: [...record.evidence.claim_ids].sort((a, b) => a.localeCompare(b)) },
    }))
        .sort((a, b) => a.tool_id.localeCompare(b.tool_id));
}
function loadToolkitJson(path) {
    const parsed = JSON.parse((0, node_fs_1.readFileSync)(path, 'utf8'));
    return normalizeToolkitRecords(parsed.records ?? []);
}
