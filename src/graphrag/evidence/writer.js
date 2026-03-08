"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeEvidenceBundle = writeEvidenceBundle;
exports.stableStringify = stableStringify;
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const index_js_1 = require("./index.js");
function stableStringify(value) {
    if (Array.isArray(value)) {
        return `[${value.map((item) => stableStringify(item)).join(",")}]`;
    }
    if (value && typeof value === "object") {
        const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
        return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
    }
    return JSON.stringify(value);
}
async function writeEvidenceBundle(entries, options) {
    await (0, promises_1.mkdir)(options.baseDir, { recursive: true });
    const sortedEntries = [...entries].sort((a, b) => a.report.evidence_id.localeCompare(b.report.evidence_id));
    for (const entry of sortedEntries) {
        const evidenceDir = node_path_1.default.join(options.baseDir, entry.report.evidence_id);
        await (0, promises_1.mkdir)(evidenceDir, { recursive: true });
        await (0, promises_1.writeFile)(node_path_1.default.join(evidenceDir, "report.json"), `${stableStringify(entry.report)}\n`, "utf8");
        await (0, promises_1.writeFile)(node_path_1.default.join(evidenceDir, "metrics.json"), `${stableStringify(entry.metrics)}\n`, "utf8");
        await (0, promises_1.writeFile)(node_path_1.default.join(evidenceDir, "stamp.json"), `${stableStringify(entry.stamp)}\n`, "utf8");
    }
    const index = (0, index_js_1.buildEvidenceIndex)(sortedEntries, options.version ?? "1.0.0");
    await (0, promises_1.writeFile)(node_path_1.default.join(options.baseDir, "index.json"), `${stableStringify(index)}\n`, "utf8");
}
