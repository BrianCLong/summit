"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvidenceStore = void 0;
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class EvidenceStore {
    baseDir;
    boundary;
    runId;
    counter = 0;
    constructor(baseDir, boundary, runId = crypto_1.default.randomUUID()) {
        this.baseDir = baseDir;
        this.boundary = boundary;
        this.runId = runId;
    }
    get runPath() {
        return path_1.default.join(this.baseDir, this.runId);
    }
    init() {
        fs_1.default.mkdirSync(path_1.default.join(this.runPath, 'evidence'), { recursive: true });
        fs_1.default.mkdirSync(path_1.default.join(this.runPath, 'raw'), { recursive: true });
    }
    nextId() {
        this.counter += 1;
        return String(this.counter).padStart(4, '0');
    }
    stable(obj) {
        const sortKeys = (input) => {
            if (Array.isArray(input)) {
                return input.map(sortKeys);
            }
            if (input && typeof input === 'object') {
                const sorted = {};
                Object.keys(input)
                    .sort()
                    .forEach((key) => {
                    sorted[key] = sortKeys(input[key]);
                });
                return sorted;
            }
            return input;
        };
        return JSON.stringify(sortKeys(obj));
    }
    record(stepName, tool, version, inputs, output, policy, notes) {
        const id = this.nextId();
        const bounded = this.boundary.markUntrusted(output);
        const rawFile = path_1.default.join(this.runPath, 'raw', `${id}-${tool}.txt`);
        const stableOutput = typeof output === 'string' ? output : JSON.stringify(output, null, 2);
        fs_1.default.writeFileSync(rawFile, stableOutput);
        const hash = crypto_1.default.createHash('sha256').update(stableOutput).digest('hex');
        const artifact = {
            id,
            stepName,
            tool,
            version,
            timestamp: new Date().toISOString(),
            inputs,
            output: bounded,
            rawOutputPath: rawFile,
            hashes: { output: hash },
            policy,
            redaction: bounded.redactions,
            notes,
            allowed: policy.allowed,
        };
        const ledgerPath = path_1.default.join(this.runPath, 'evidence', 'evidence.ndjson');
        const serialized = this.stable(artifact);
        fs_1.default.appendFileSync(ledgerPath, `${serialized}\n`);
        return artifact;
    }
    writeRunSummary(summary) {
        const summaryPath = path_1.default.join(this.runPath, 'run.json');
        fs_1.default.writeFileSync(summaryPath, this.stable(summary));
        return summaryPath;
    }
    writeReport(markdown) {
        const reportPath = path_1.default.join(this.runPath, 'report.md');
        fs_1.default.writeFileSync(reportPath, markdown);
        return reportPath;
    }
    writeJudge(judge, markdown) {
        const jsonPath = path_1.default.join(this.runPath, 'judge.json');
        const mdPath = path_1.default.join(this.runPath, 'judge.md');
        fs_1.default.writeFileSync(jsonPath, this.stable(judge));
        fs_1.default.writeFileSync(mdPath, markdown);
        return { jsonPath, mdPath };
    }
}
exports.EvidenceStore = EvidenceStore;
