import fs from 'fs';
import path from 'path';
import { RubricBenchLoader } from '../../src/datasets/rubricbench/loader.js';
import { RubricGraphBuilder } from '../../src/graphrag/builders/rubricgraph.js';
import { buildCompositeRubric } from '../../src/evals/rubrics/normalize.js';
import { RubricEvaluator } from '../../src/evals/rubrics/evaluator.js';
import { RewardModelFeatures } from '../../src/rrm/features.js';
import { RewardModelInference } from '../../src/rrm/infer.js';
import { GovernanceEngine } from '../../src/governance/engine.js';
import { AuditLogger } from '../../src/governance/audit/logger.js';

async function main() {
    const fixturePath = path.resolve('tests/fixtures/rubricbench/sample.jsonl');
    const items = await RubricBenchLoader.loadFile(fixturePath);

    // Ingest Dataset
    console.log(`Loaded ${items.length} items`);
    RubricBenchLoader.generateDeterministicArtifact(items, 'report', 'artifacts/rubricbench');
    RubricBenchLoader.generateDeterministicArtifact(items, 'metrics', 'artifacts/rubricbench');

    // Build Graph & Eval
    const graphBuilder = new RubricGraphBuilder();
    const rrm = new RewardModelInference();
    const policyPath = path.resolve('src/governance/policy.schema.json');
    const policiesRaw = JSON.parse(fs.readFileSync(policyPath, 'utf-8'));
    // mock mock policy loading
    const engine = new GovernanceEngine([{ id: 'mock', effect: 'allow' }]);
    const logger = new AuditLogger('artifacts/governance/decision_log.json');

    fs.mkdirSync('artifacts/governance', { recursive: true });

    for (const item of items) {
        const evidenceId = RubricBenchLoader.generateEvidenceId(item);
        const instId = graphBuilder.addInstruction(item.instruction);

        const atomicCriteria = item.atomic_rubrics.map(ar => ar.criterion);
        const composite = buildCompositeRubric(item.instruction, atomicCriteria);

        for (const ar of item.atomic_rubrics) {
            graphBuilder.addAtomicRubric(ar.criterion, instId);
        }

        // Eval Output A
        const evalA = RubricEvaluator.evaluate(composite, item.output_a, 'model-a', evidenceId + '-A');
        const evalIdA = graphBuilder.addEvalRun(evalA.evidenceId, evalA.model, evalA.output, evalA.totalScore, instId);

        // Eval Output B
        const evalB = RubricEvaluator.evaluate(composite, item.output_b, 'model-b', evidenceId + '-B');
        const evalIdB = graphBuilder.addEvalRun(evalB.evidenceId, evalB.model, evalB.output, evalB.totalScore, instId);

        // RRM inference (A)
        const featuresA = RewardModelFeatures.extract(evalA.scores, { nodeCount: 5, edgeCount: 5 });
        const rewardA = rrm.infer(featuresA.features).score;

        // Governance decision (A)
        const decisionA = engine.evaluate(evalA.evidenceId, rewardA, 1.0);
        logger.log(decisionA);
    }

    const graphData = graphBuilder.export();
    fs.mkdirSync('artifacts/rubricgraph', { recursive: true });
    fs.writeFileSync('artifacts/rubricgraph/graph.json', JSON.stringify(graphData, null, 2));

    // Generate Calibration Mock
    fs.mkdirSync('artifacts/rrm', { recursive: true });
    fs.writeFileSync('artifacts/rrm/calibration.json', JSON.stringify({ accuracy: 0.95, stamp: "mockhash123" }, null, 2));

    console.log('Artifacts generated successfully');
}

main().catch(console.error);
