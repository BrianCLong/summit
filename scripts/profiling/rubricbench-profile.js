"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const evaluator_js_1 = require("../../src/evals/rubrics/evaluator.js");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
async function profileEvaluator() {
    const rubrics = [
        { id: "r1", criterion: "Accuracy", weight: 0.5 },
        { id: "r2", criterion: "Tone", weight: 0.5 }
    ];
    const start = Date.now();
    const initialMem = process.memoryUsage().heapUsed;
    (0, evaluator_js_1.evaluateRubricAlignment)(rubrics, "Sample output for profiling the rubric alignment.");
    const end = Date.now();
    const finalMem = process.memoryUsage().heapUsed;
    const latencyMs = end - start;
    const memoryUsedMb = (finalMem - initialMem) / 1024 / 1024;
    const profileResult = {
        latencyMs,
        memoryUsedMb,
        meetsLatencyBudget: latencyMs < 200,
        meetsMemoryBudget: memoryUsedMb < 256,
        status: (latencyMs < 200 && memoryUsedMb < 256) ? "pass" : "fail"
    };
    const artifactsDir = path_1.default.resolve(__dirname, '../../artifacts/profiling');
    if (!fs_1.default.existsSync(artifactsDir)) {
        fs_1.default.mkdirSync(artifactsDir, { recursive: true });
    }
    fs_1.default.writeFileSync(path_1.default.join(artifactsDir, 'rubricbench.json'), JSON.stringify(profileResult, null, 2));
    console.log("Profiling complete. Results:", profileResult);
}
profileEvaluator().catch(console.error);
