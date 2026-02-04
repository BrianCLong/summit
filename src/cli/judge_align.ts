import { ingestFeedback } from '../evals/memalign/ingest';
import { distillMemories } from '../evals/memalign/distill';
import { EpisodicStore } from '../evals/memalign/episodic_store';
import { SemanticStore } from '../evals/memalign/semantic_store';
import { saveArtifacts } from '../evals/memalign/artifacts';
import * as path from 'path';

// Simple arg parser
function parseArgs() {
  const args = process.argv.slice(2);
  const options: Record<string, string> = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--help' || args[i] === '-h') {
      console.log('Usage: judge:align --judge <name> --input <path> --out <path>');
      process.exit(0);
    }
    if (args[i].startsWith('--')) {
      const key = args[i].substring(2);
      const value = args[i + 1];
      if (value && !value.startsWith('--')) {
        options[key] = value;
        i++;
      }
    } else if (args[i].startsWith('-')) {
       // Short args mapping
       const map: Record<string, string> = {'-j': 'judge', '-i': 'input', '-o': 'out'};
       const key = map[args[i]];
       if (key) {
         const value = args[i + 1];
         options[key] = value;
         i++;
       }
    }
  }
  return options;
}

async function main() {
  const options = parseArgs();

  if (!options.judge || !options.input || !options.out) {
    console.error('Missing required arguments: --judge, --input, --out');
    console.log('Usage: judge:align --judge <name> --input <path> --out <path>');
    process.exit(1);
  }

  console.log(`Aligning judge ${options.judge}...`);

  const outputDir = options.out;
  const episodicPath = path.join(outputDir, 'episodic.json');
  const semanticPath = path.join(outputDir, 'semantic.json');

  const epiStore = new EpisodicStore(episodicPath);
  const semStore = new SemanticStore(semanticPath);

  // 1. Ingest
  console.log('Ingesting feedback...');
  const ingested = await ingestFeedback(options.input, epiStore, options.judge);
  console.log(`Ingested ${ingested} traces.`);

  // 2. Distill
  console.log('Distilling memories...');
  const distilled = await distillMemories(epiStore, semStore, options.judge);
  console.log(`Distilled ${distilled} rules.`);

  // 3. Generate Artifacts
  const report = {
    judgeName: options.judge,
    traces: ingested,
    results: []
  };

  const metrics = {
    latencyP95: 0,
    avgScore: 0,
    retrievalHitRate: 1.0
  };

  saveArtifacts(outputDir, report, metrics);
  console.log(`Artifacts saved to ${outputDir}`);
}

// ESM boilerplate
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
