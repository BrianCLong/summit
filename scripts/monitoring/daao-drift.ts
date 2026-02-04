import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { HeuristicDifficultyScorer } from '../../agents/orchestrator/src/daao/difficulty/heuristicDifficultyScorer.js';
import { CostAwareLLMRouter } from '../../agents/orchestrator/src/daao/routing/llmRouter.js';
import { DefaultModelCatalog } from '../../agents/orchestrator/src/daao/routing/modelCatalog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const fixturesPath = path.join(__dirname, 'fixtures', 'daao-prompts.json');
  const fixtures = JSON.parse(fs.readFileSync(fixturesPath, 'utf-8'));

  const scorer = new HeuristicDifficultyScorer();
  const catalog = new DefaultModelCatalog();
  const router = new CostAwareLLMRouter(catalog);

  const results: any[] = [];

  for (const fixture of fixtures) {
    const difficulty = await scorer.estimate(fixture.text);
    const decision = await router.route(difficulty, { budget: 0.5 }); // Fixed budget for drift check

    results.push({
      fixtureId: fixture.id,
      difficultyBand: difficulty.band,
      modelId: decision.modelId,
      estimatedCost: decision.estimatedWorstCaseCost,
      reasons: decision.reasons
    });
  }

  const outDir = path.join(__dirname, 'out');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir);
  }

  const outFile = path.join(outDir, 'daao-drift.json');
  fs.writeFileSync(outFile, JSON.stringify(results, null, 2));
  console.log(`Drift check complete. Results written to ${outFile}`);
}

main().catch(console.error);
