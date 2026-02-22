import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Minimal types matching schemas
interface Node {
  node_id: string;
  kind: string;
  [key: string]: any;
}

interface DeltaOutput {
  run_id: string;
  previous_run_hash: string;
  new_claims: Node[];
  removed_claims: string[];
  updated_claims: Node[];
  new_artifacts: Node[];
  state_transitions: any[];
}

function computeHash(data: any): string {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.error('Usage: tsx 60_extract_delta.ts <prev_state_path> <current_nodes_path> <output_dir>');
    process.exit(1);
  }

  const [prevStatePath, currentNodesPath, outputDir] = args;

  // Read inputs
  // In a real run, handle missing prev state (first run)
  let prevState: any = { claims: [], artifacts: [], run_hash: 'initial' };
  if (fs.existsSync(prevStatePath)) {
    prevState = JSON.parse(fs.readFileSync(prevStatePath, 'utf-8'));
  }

  const currentNodes: Node[] = JSON.parse(fs.readFileSync(currentNodesPath, 'utf-8'));

  const currentClaims = currentNodes.filter(n => n.kind === 'Claim');
  const currentArtifacts = currentNodes.filter(n => n.kind === 'Artifact');

  const prevClaimsMap = new Map(prevState.claims?.map((c: Node) => [c.node_id, c]));

  const newClaims: Node[] = [];
  const updatedClaims: Node[] = [];
  const removedClaims: string[] = []; // In this simplistic view, if it's not in current, it's removed? Or maybe persisted?
  // For narrative CI, typically we accumulate, but let's assume currentNodes is the full view or daily view.
  // "What changed today" usually implies comparing today's snapshot vs yesterday's.

  const currentClaimsMap = new Map();

  for (const claim of currentClaims) {
    currentClaimsMap.set(claim.node_id, claim);
    const prev = prevClaimsMap.get(claim.node_id);
    if (!prev) {
      newClaims.push(claim);
    } else {
      // Check for updates (ignoring pure metadata if needed, but strict for now)
      if (JSON.stringify(prev) !== JSON.stringify(claim)) {
        updatedClaims.push(claim);
      }
    }
  }

  // Check removed
  for (const [id, claim] of prevClaimsMap) {
    if (!currentClaimsMap.has(id)) {
      removedClaims.push(id);
    }
  }

  // Artifacts (assume additive usually, but let's track new)
  const prevArtifactsIds = new Set(prevState.artifacts?.map((a: Node) => a.node_id) || []);
  const newArtifacts = currentArtifacts.filter(a => !prevArtifactsIds.has(a.node_id));

  const delta: DeltaOutput = {
    run_id: new Date().toISOString().split('T')[0], // simplistic run_id
    previous_run_hash: prevState.run_hash || 'genesis',
    new_claims: newClaims,
    removed_claims: removedClaims,
    updated_claims: updatedClaims,
    new_artifacts: newArtifacts,
    state_transitions: [] // Placeholder for state machine step integration
  };

  const deltaHash = computeHash(delta);
  const outPath = path.join(outputDir, `delta_${deltaHash}.json`);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outPath, JSON.stringify(delta, null, 2));
  console.log(`Delta written to ${outPath}`);

  // Also write a deterministic mapping file if needed, but the plan asks for out/delta/<hash>.json
}

main().catch(console.error);
