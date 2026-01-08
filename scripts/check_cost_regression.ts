import fs from "fs";

interface BenchmarkResult {
  totalCost: number;
}

interface Baseline {
  totalCost: number;
  allowedDriftPercent: number;
}

function checkRegression() {
  try {
    const baselineRaw = fs.readFileSync("cost-baseline.json", "utf-8");
    const baseline: Baseline = JSON.parse(baselineRaw);

    const resultsRaw = fs.readFileSync("cost-benchmark-results.json", "utf-8");
    const results: BenchmarkResult = JSON.parse(resultsRaw);

    const diff = results.totalCost - baseline.totalCost;
    const driftPercent = (diff / baseline.totalCost) * 100;

    console.log(`Baseline Cost: $${baseline.totalCost}`);
    console.log(`Current Cost:  $${results.totalCost}`);
    console.log(`Drift:         ${driftPercent.toFixed(2)}%`);

    if (driftPercent > baseline.allowedDriftPercent) {
      console.error(
        `FAILURE: Cost regression detected! Drift of ${driftPercent.toFixed(2)}% exceeds allowed ${baseline.allowedDriftPercent}%`
      );
      process.exit(1);
    } else if (driftPercent < -baseline.allowedDriftPercent) {
      console.log(
        `WARNING: Significant cost reduction detected (${driftPercent.toFixed(2)}%). Please update baseline.`
      );
      // We don't fail on improvement, but we flag it.
    } else {
      console.log("SUCCESS: Cost is within allowed drift.");
    }
  } catch (e) {
    console.error("Error checking regression:", e);
    process.exit(1);
  }
}

checkRegression();
