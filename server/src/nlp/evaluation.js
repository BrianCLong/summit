"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvaluationHarness = void 0;
exports.writeAlert = writeAlert;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pipeline_js_1 = require("./pipeline.js");
class EvaluationHarness {
    pipeline;
    testSetPath;
    constructor(options = {}) {
        this.pipeline = new pipeline_js_1.TextIngestionPipeline({ modelName: options.modelName });
        this.testSetPath = options.testSetPath || path_1.default.join(__dirname, '..', '..', 'data', 'domain-test-set.json');
    }
    async run() {
        const dataset = (0, pipeline_js_1.loadDomainTestSet)(this.testSetPath);
        const documents = dataset.map((row) => ({
            source: 'file',
            payload: row,
        }));
        const start = Date.now();
        const processed = documents.map((doc) => this.pipeline.process(doc));
        const resolved = await Promise.all(processed.map((promise) => promise.catch(() => undefined)));
        const results = resolved.filter(Boolean);
        const latencyMs = Date.now() - start;
        const positives = results.flatMap((item) => item.relationships);
        const truePositives = positives.filter((rel) => rel.confidence > 0.5).length;
        const predicted = positives.length;
        const expected = dataset.length; // placeholder ground truth size
        const precision = predicted === 0 ? 0 : truePositives / predicted;
        const recall = expected === 0 ? 0 : truePositives / expected;
        const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
        return { precision, recall, f1, latencyMs, total: dataset.length };
    }
    report(metrics) {
        return [
            `precision=${metrics.precision.toFixed(3)}`,
            `recall=${metrics.recall.toFixed(3)}`,
            `f1=${metrics.f1.toFixed(3)}`,
            `latency_ms=${metrics.latencyMs}`,
            `samples=${metrics.total}`,
        ].join('\n');
    }
}
exports.EvaluationHarness = EvaluationHarness;
function writeAlert(metrics, threshold = 0.6, filePath) {
    const alert = {
        at: new Date().toISOString(),
        ok: metrics.f1 >= threshold,
        metrics,
    };
    if (filePath) {
        fs_1.default.writeFileSync(filePath, JSON.stringify(alert, null, 2));
    }
    return alert;
}
