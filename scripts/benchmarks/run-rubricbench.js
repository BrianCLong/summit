"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const loader_js_1 = require("../../src/datasets/rubricbench/loader.js");
const evaluator_js_1 = require("../../src/evals/rubrics/evaluator.js");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
async function runBenchmark() {
    if (process.env.SUMMIT_FEATURE_RUBRICBENCH !== 'true') {
        console.log("SUMMIT_FEATURE_RUBRICBENCH feature flag is not 'true'. Exiting benchmark runner.");
        return;
    }
    const connector = new loader_js_1.RubricBenchConnector();
    const dataset = await connector.send({}, undefined);
    // Mock AtomicRubrics
    const rubrics = [
        { id: "r1", criterion: "Accuracy", weight: 0.5 },
        { id: "r2", criterion: "Formatting", weight: 0.5 },
    ];
    let totalModelScore = 0;
    let totalHumanScore = 0;
    let count = 0;
    for (const item of dataset) {
        const modelResult = (0, evaluator_js_1.evaluateRubricAlignment)(rubrics, item.output_a);
        const humanResult = (0, evaluator_js_1.evaluateRubricAlignment)(rubrics, item.output_b);
        totalModelScore += modelResult.score;
        totalHumanScore += humanResult.score;
        count++;
    }
    const metrics = {
        model: "gpt-4",
        rubric_alignment: count > 0 ? totalModelScore / count : 0,
        human_alignment: count > 0 ? totalHumanScore / count : 0,
        gap: count > 0 ? (totalHumanScore - totalModelScore) / count : 0
    };
    const report = {
        totalItems: count,
        metrics,
        status: "success"
    };
    const artifactsDir = path_1.default.resolve(__dirname, '../../artifacts/rubricbench');
    if (!fs_1.default.existsSync(artifactsDir)) {
        fs_1.default.mkdirSync(artifactsDir, { recursive: true });
    }
    // To meet deterministic requirements, remove timestamp inside output content if not strictly needed,
    // or use a fixed ID scheme.
    const deterministicStamp = {
        id: "SUMMIT.AI_EVALS.rubricbench.case_id.grader",
        status: "verified"
    };
    fs_1.default.writeFileSync(path_1.default.join(artifactsDir, 'metrics.json'), JSON.stringify(metrics, null, 2));
    fs_1.default.writeFileSync(path_1.default.join(artifactsDir, 'report.json'), JSON.stringify(report, null, 2));
    fs_1.default.writeFileSync(path_1.default.join(artifactsDir, 'stamp.json'), JSON.stringify(deterministicStamp, null, 2));
    console.log("Benchmark complete. Metrics:", metrics);
}
runBenchmark().catch(console.error);
