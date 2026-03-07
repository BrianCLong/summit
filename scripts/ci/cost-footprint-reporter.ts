import * as fs from 'fs';
import { execSync } from 'child_process';

const AVG_COST_PER_CI_MINUTE = 0.008;
const AVG_COST_PER_VECTOR_STORAGE_GB = 0.05;
const AVG_COST_PER_GRAPH_QUERY = 0.001;
const BUDGET_THRESHOLD_USD = 10.0;

interface CostEstimate {
  llmCalls: number;
  vectorStorage: number;
  graphQueries: number;
  ciMinutes: number;
  totalEstimatedCost: number;
}

// Simulated data fetching
async function calculateCosts(): Promise<CostEstimate> {
  const ciMinutes = 15;
  const vectorStorageGB = 0.5;
  const graphQueries = 150;
  const llmCost = 1.65;

  const costs = {
    llmCalls: llmCost,
    vectorStorage: vectorStorageGB * AVG_COST_PER_VECTOR_STORAGE_GB,
    graphQueries: graphQueries * AVG_COST_PER_GRAPH_QUERY,
    ciMinutes: ciMinutes * AVG_COST_PER_CI_MINUTE,
  };

  const totalEstimatedCost = costs.llmCalls + costs.vectorStorage + costs.graphQueries + costs.ciMinutes;
  return { ...costs, totalEstimatedCost };
}

async function main() {
  console.log("Analyzing cost metrics...");
  const estimate = await calculateCosts();

  console.log("\n--- Cost Footprint Estimate ---");
  console.log(`LLM Calls: $${estimate.llmCalls.toFixed(3)}`);
  console.log(`Vector Storage: $${estimate.vectorStorage.toFixed(3)}`);
  console.log(`Graph Queries: $${estimate.graphQueries.toFixed(3)}`);
  console.log(`CI Minutes: $${estimate.ciMinutes.toFixed(3)}`);
  console.log(`-------------------------------`);
  console.log(`Total Estimated Cost: $${estimate.totalEstimatedCost.toFixed(3)}`);

  if (estimate.totalEstimatedCost > BUDGET_THRESHOLD_USD) {
    console.error(`\n❌ ERROR: Estimated cost ($${estimate.totalEstimatedCost.toFixed(3)}) exceeds budget threshold ($${BUDGET_THRESHOLD_USD.toFixed(3)}).`);
    process.exit(1);
  } else {
    console.log(`\n✅ Estimated cost is within budget.`);
  }

  const commentBody = `
## 💰 Cost Footprint

| Category | Estimated Cost |
|---|---|
| 🤖 LLM Calls | $${estimate.llmCalls.toFixed(3)} |
| 🗄️ Vector Storage | $${estimate.vectorStorage.toFixed(3)} |
| 🕸️ Graph Queries | $${estimate.graphQueries.toFixed(3)} |
| ⏱️ CI Minutes | $${estimate.ciMinutes.toFixed(3)} |
| **Total** | **$${estimate.totalEstimatedCost.toFixed(3)}** |

> Budget Threshold: $${BUDGET_THRESHOLD_USD.toFixed(2)}
${estimate.totalEstimatedCost > BUDGET_THRESHOLD_USD ? '⚠️ **WARNING: Budget threshold exceeded!**' : '✅ Cost is within budget limits.'}
`;

  fs.writeFileSync('cost-footprint-comment.md', commentBody);
  console.log("Saved PR comment payload to cost-footprint-comment.md");
}

main().catch(console.error);
