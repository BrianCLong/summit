"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvidenceWriter = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class EvidenceWriter {
    baseDir;
    version;
    constructor(baseDir, version = '1.0.0') {
        this.baseDir = baseDir;
        this.version = version;
        if (!fs_1.default.existsSync(this.baseDir)) {
            fs_1.default.mkdirSync(this.baseDir, { recursive: true });
        }
    }
    writeEvidence(evidenceId, classification, summary, metricsData, notes = []) {
        const evidenceDir = path_1.default.join(this.baseDir, evidenceId);
        if (!fs_1.default.existsSync(evidenceDir)) {
            fs_1.default.mkdirSync(evidenceDir, { recursive: true });
        }
        const report = {
            evidence_id: evidenceId,
            classification,
            summary,
            notes,
        };
        // Ensure determinism by sorting keys if needed, but JS objects generally preserve insertion order for non-integer keys.
        // We rely on consistent input order or just that JSON is mostly stable.
        this.writeJson(path_1.default.join(evidenceDir, 'report.json'), report);
        const metrics = {
            evidence_id: evidenceId,
            metrics: metricsData,
        };
        this.writeJson(path_1.default.join(evidenceDir, 'metrics.json'), metrics);
        const stamp = {
            evidence_id: evidenceId,
            generated_at: new Date().toISOString(),
        };
        this.writeJson(path_1.default.join(evidenceDir, 'stamp.json'), stamp);
        this.updateIndex(evidenceId, evidenceDir);
    }
    writeJson(filePath, data) {
        fs_1.default.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
    }
    updateIndex(evidenceId, evidencePath) {
        const indexFile = path_1.default.join(this.baseDir, 'index.json');
        let index = { version: this.version, items: [] };
        if (fs_1.default.existsSync(indexFile)) {
            try {
                const content = fs_1.default.readFileSync(indexFile, 'utf-8');
                index = JSON.parse(content);
            }
            catch (e) {
                // Create new if corrupt or empty
                index = { version: this.version, items: [] };
            }
        }
        // Remove existing entry for this ID if any
        index.items = index.items.filter(item => item.evidence_id !== evidenceId);
        // Add new entry
        const relPath = path_1.default.relative(this.baseDir, evidencePath);
        index.items.push({ evidence_id: evidenceId, path: relPath });
        // Sort items by ID for deterministic index
        index.items.sort((a, b) => a.evidence_id.localeCompare(b.evidence_id));
        this.writeJson(indexFile, index);
    }
}
exports.EvidenceWriter = EvidenceWriter;
