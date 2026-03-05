import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { evaluateRubricAlignment } from '../../src/evals/rubrics/evaluator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function profileEvaluator() {
    const rubrics = [
        { id: "r1", criterion: "Accuracy", weight: 0.5 },
        { id: "r2", criterion: "Tone", weight: 0.5 }
    ];

    const start = Date.now();
    const initialMem = process.memoryUsage().heapUsed;

    evaluateRubricAlignment(rubrics, "Sample output for profiling the rubric alignment.");

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

    const artifactsDir = path.resolve(__dirname, '../../artifacts/profiling');
    if (!fs.existsSync(artifactsDir)) {
      fs.mkdirSync(artifactsDir, { recursive: true });
    }

    fs.writeFileSync(path.join(artifactsDir, 'rubricbench.json'), JSON.stringify(profileResult, null, 2));
    console.log("Profiling complete. Results:", profileResult);
}

profileEvaluator().catch(console.error);
