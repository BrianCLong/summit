// scripts/agents/longhorizon/run-fixture.ts
import { validatePRChain } from '../../../src/agents/longhorizon/schema/validate';
import { buildStagesFromChain } from '../../../src/agents/longhorizon/builder/build_stages';
import { runEvaluation } from '../../../src/agents/longhorizon/evaluator/evaluate';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const enabled = process.env.LONGHORIZON_PR_CHAINS_ENABLED === 'true';
  if (!enabled) {
    console.log('⏩ Long-Horizon PR Chains track is disabled (LONGHORIZON_PR_CHAINS_ENABLED != true). Skipping.');
    return;
  }

  const fixturePath = process.argv[2] || path.join(process.cwd(), 'tests/fixtures/longhorizon/pr_chain_minimal.jsonl');
  if (!fs.existsSync(fixturePath)) {
    console.error(`❌ Fixture not found at ${fixturePath}`);
    process.exit(1);
  }

  console.log(`🧪 Running Long-Horizon evaluation for fixture: ${fixturePath}`);

  const content = fs.readFileSync(fixturePath, 'utf8').trim();
  const record = JSON.parse(content);

  const validated = validatePRChain(record);
  const stagedTask = buildStagesFromChain(validated);

  const { report, metrics, stamp } = await runEvaluation(stagedTask);

  const outputDir = path.join(process.cwd(), 'artifacts/longhorizon', report.evidence_id);
  fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(outputDir, 'metrics.json'), JSON.stringify(metrics, null, 2));
  fs.writeFileSync(path.join(outputDir, 'stamp.json'), JSON.stringify(stamp, null, 2));

  console.log(`✅ Evaluation complete. Artifacts saved to ${outputDir}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
