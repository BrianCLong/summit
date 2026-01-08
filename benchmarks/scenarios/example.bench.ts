import { BenchRunner } from "../runner/robust-runner.js";
import path from "path";

async function run() {
  const runner = new BenchRunner();

  // Scenario 1: JSON Serialization
  const largeObject = Array.from({ length: 1000 }).map((_, i) => ({ id: i, name: `Item ${i}` }));
  await runner.run({
    name: "JSON.stringify Large Array",
    fn: () => {
      JSON.stringify(largeObject);
    },
    measureIterations: 50,
  });

  // Scenario 2: Array Sorting
  await runner.run({
    name: "Array.sort Random Numbers",
    fn: () => {
      const arr = Array.from({ length: 10000 }, () => Math.random());
      arr.sort((a, b) => a - b);
    },
    measureIterations: 30,
  });

  // Scenario 3: Simulated Unstable Op (Random Sleep)
  await runner.run({
    name: "Unstable Operation (Simulated)",
    fn: async () => {
      const delay = 10 + Math.random() * 50; // High variance
      await new Promise((resolve) => setTimeout(resolve, delay));
    },
    measureIterations: 20,
    maxStdDevPct: 50, // Relaxed threshold for demo, but expected to flag warn if > 50
  });

  runner.saveReport(path.join(process.cwd(), "bench_results.json"));
}

run().catch(console.error);
