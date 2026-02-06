import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { extractDefaults } from './inference/defaults_extractor';
import { findRedundancyClusters } from './redundancy/cluster';
import { calculateConvergenceMetrics } from './convergence/metrics';
import { NarrativeEvidencePack } from './schema/evidence_v1';
import { resolve, dirname } from 'path';

async function main() {
  const args = process.argv.slice(2);
  const inIdx = args.indexOf('--in');
  const outIdx = args.indexOf('--out');

  if (inIdx === -1 || outIdx === -1) {
    console.error('Usage: narrative:analyze --in <file> --out <dir>');
    process.exit(1);
  }

  const inFile = args[inIdx + 1];
  const outDir = args[outIdx + 1];

  console.log(`Analyzing ${inFile}...`);

  // Read input (expecting array of {id, text})
  const input = JSON.parse(readFileSync(inFile, 'utf8'));

  // 1. Extract Defaults
  const defaults = [];
  for (const doc of input) {
    const docDefaults = await extractDefaults(doc.text, doc.id || doc.doc_id);
    defaults.push(...docDefaults);
  }

  // 2. Redundancy Clusters
  const clusters = findRedundancyClusters(input);

  // 3. Convergence
  const texts = input.map((d: any) => d.text);
  const convergence = calculateConvergenceMetrics(texts, 24);

  // 4. Identity (Mocked for CLI single-pass)
  // In real system, would load existing IDs

  const pack: NarrativeEvidencePack = {
    interpretive_defaults: defaults,
    redundancy_clusters: clusters,
    convergence: convergence,
    narrative_ids: [] // IDs would require persistence layer
  };

  // Write outputs
  mkdirSync(outDir, { recursive: true });

  writeFileSync(resolve(outDir, 'interpretive_defaults.json'), JSON.stringify(defaults, null, 2));
  writeFileSync(resolve(outDir, 'redundancy_clusters.json'), JSON.stringify(clusters, null, 2));
  writeFileSync(resolve(outDir, 'convergence.json'), JSON.stringify(convergence, null, 2));
  writeFileSync(resolve(outDir, 'full_pack.json'), JSON.stringify(pack, null, 2));

  console.log(`Analysis complete. Results in ${outDir}`);
}

main().catch(console.error);
