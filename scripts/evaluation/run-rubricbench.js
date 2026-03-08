"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const loader_js_1 = require("../../src/datasets/rubricbench/loader.js");
const rubricgraph_js_1 = require("../../src/graphrag/builders/rubricgraph.js");
const normalize_js_1 = require("../../src/evals/rubrics/normalize.js");
const evaluator_js_1 = require("../../src/evals/rubrics/evaluator.js");
const features_js_1 = require("../../src/rrm/features.js");
const infer_js_1 = require("../../src/rrm/infer.js");
const engine_js_1 = require("../../src/governance/engine.js");
const logger_js_1 = require("../../src/governance/audit/logger.js");
async function main() {
    const fixturePath = path_1.default.resolve('tests/fixtures/rubricbench/sample.jsonl');
    const items = await loader_js_1.RubricBenchLoader.loadFile(fixturePath);
    // Ingest Dataset
    console.log(`Loaded ${items.length} items`);
    loader_js_1.RubricBenchLoader.generateDeterministicArtifact(items, 'report', 'artifacts/rubricbench');
    loader_js_1.RubricBenchLoader.generateDeterministicArtifact(items, 'metrics', 'artifacts/rubricbench');
    // Build Graph & Eval
    const graphBuilder = new rubricgraph_js_1.RubricGraphBuilder();
    const rrm = new infer_js_1.RewardModelInference();
    const policyPath = path_1.default.resolve('src/governance/policy.schema.json');
    const policiesRaw = JSON.parse(fs_1.default.readFileSync(policyPath, 'utf-8'));
    // mock mock policy loading
    const engine = new engine_js_1.GovernanceEngine([{ id: 'mock', effect: 'allow' }]);
    const logger = new logger_js_1.AuditLogger('artifacts/governance/decision_log.json');
    fs_1.default.mkdirSync('artifacts/governance', { recursive: true });
    for (const item of items) {
        const evidenceId = loader_js_1.RubricBenchLoader.generateEvidenceId(item);
        const instId = graphBuilder.addInstruction(item.instruction);
        const atomicCriteria = item.atomic_rubrics.map(ar => ar.criterion);
        const composite = (0, normalize_js_1.buildCompositeRubric)(item.instruction, atomicCriteria);
        for (const ar of item.atomic_rubrics) {
            graphBuilder.addAtomicRubric(ar.criterion, instId);
        }
        // Eval Output A
        const evalA = evaluator_js_1.RubricEvaluator.evaluate(composite, item.output_a, 'model-a', evidenceId + '-A');
        const evalIdA = graphBuilder.addEvalRun(evalA.evidenceId, evalA.model, evalA.output, evalA.totalScore, instId);
        // Eval Output B
        const evalB = evaluator_js_1.RubricEvaluator.evaluate(composite, item.output_b, 'model-b', evidenceId + '-B');
        const evalIdB = graphBuilder.addEvalRun(evalB.evidenceId, evalB.model, evalB.output, evalB.totalScore, instId);
        // RRM inference (A)
        const featuresA = features_js_1.RewardModelFeatures.extract(evalA.scores, { nodeCount: 5, edgeCount: 5 });
        const rewardA = rrm.infer(featuresA.features).score;
        // Governance decision (A)
        const decisionA = engine.evaluate(evalA.evidenceId, rewardA, 1.0);
        logger.log(decisionA);
    }
    const graphData = graphBuilder.export();
    fs_1.default.mkdirSync('artifacts/rubricgraph', { recursive: true });
    fs_1.default.writeFileSync('artifacts/rubricgraph/graph.json', JSON.stringify(graphData, null, 2));
    // Generate Calibration Mock
    fs_1.default.mkdirSync('artifacts/rrm', { recursive: true });
    fs_1.default.writeFileSync('artifacts/rrm/calibration.json', JSON.stringify({ accuracy: 0.95, stamp: "mockhash123" }, null, 2));
    console.log('Artifacts generated successfully');
}
main().catch(console.error);
