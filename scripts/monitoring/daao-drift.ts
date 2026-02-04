import fs from 'fs';
import path from 'path';
// Assuming running from root with tsx
import { HeuristicDifficultyScorer } from '../../packages/maestro-core/src/daao/difficulty/heuristicDifficultyScorer';
import { CostAwareLLMRouter } from '../../packages/maestro-core/src/daao/routing/llmRouter';
import { DefaultModelCatalog } from '../../packages/maestro-core/src/daao/routing/modelCatalog';

// Adjust path based on execution context
const FIXTURES_PATH = path.join(process.cwd(), 'scripts', 'monitoring', 'fixtures', 'daao-prompts.json');
const OUT_PATH = path.join(process.cwd(), 'scripts', 'monitoring', 'out', 'daao-drift.json');

async function main() {
  console.log(`Reading fixtures from ${FIXTURES_PATH}`);
  const fixtures = JSON.parse(fs.readFileSync(FIXTURES_PATH, 'utf-8'));

  const scorer = new HeuristicDifficultyScorer();
  const catalog = new DefaultModelCatalog();
  const router = new CostAwareLLMRouter(catalog);

  const results: any[] = [];

  for (const fixture of fixtures) {
    const difficulty = await scorer.estimate(fixture.text);
    // Estimate tokens: simplistic char / 4
    const estimatedTokens = Math.ceil(fixture.text.length / 4);
    const decision = router.route(difficulty, estimatedTokens, 1000); // High budget

    results.push({
      fixtureId: fixture.id,
      difficultyBand: difficulty.band,
      modelId: decision.modelId,
      reason: decision.reason
    });
  }

  // Ensure output dir exists
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
  console.log(`Drift report written to ${OUT_PATH}`);
}

main().catch(console.error);
