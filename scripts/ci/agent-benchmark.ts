import { EvaluationRunner } from '../../src/agent-scaling/evaluation-runner';

async function runBenchmark() {
    console.log("Starting Agent Scaling Benchmark...");
    try {
        const runner = new EvaluationRunner();
        const results = await runner.runEvaluation();
        console.log("Evaluation complete.", results);
        console.log("Artifacts written to reports/agent-scaling/ and artifacts/xai/");
        process.exit(0);
    } catch (e) {
        console.error("Benchmark failed:", e);
        process.exit(1);
    }
}

runBenchmark();
