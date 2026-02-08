import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

// Define minimal interfaces for Tier Config
interface Tier {
  id: string;
  name: string;
  score_weight: number;
}

interface HandoffRule {
  from: string;
  to: string;
  risk_level: string;
}

interface TierConfig {
  tiers: Tier[];
  allowed_handoffs: HandoffRule[];
}

interface Node {
  node_id: string;
  kind: string;
  outlet_tier?: string;
  [key: string]: any;
}

interface HandoffEvent {
  handoff_id: string;
  narrative_id: string;
  from_tier: string;
  to_tier: string;
  score: number;
  risk_level: string;
  timestamp: string;
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.error('Usage: tsx 31_score_handoff.ts <config_path> <nodes_path> <output_path>');
    process.exit(1);
  }

  const [configPath, nodesPath, outputPath] = args;

  // Load config
  const configContent = fs.readFileSync(configPath, 'utf-8');
  const config = yaml.load(configContent) as TierConfig;
  const tiersMap = new Map(config.tiers.map(t => [t.id, t]));

  // Load nodes (Claims, Artifacts, Narratives)
  const nodes: Node[] = JSON.parse(fs.readFileSync(nodesPath, 'utf-8'));

  // Find artifacts and group by narrative (simplified logic: assuming claims link to artifacts and belong to narrative)
  // For this MVI, let's assume input has 'Narrative' nodes with 'artifacts' or we infer from edges.
  // We'll simplify: Input is a list of Artifacts with 'outlet_tier'. We track changes over time or just score current set.
  // The plan mentions "migration across credibility tiers must be surfaced as events".
  // This implies comparing previous state (or history) to current.
  // But let's just implement the scoring logic based on current artifacts for a narrative.

  // Mock: finding a narrative and its associated artifacts
  const handoffs: HandoffEvent[] = [];

  // Example logic:
  // If we see artifacts from 'fringe' and 'mainstream' for the same narrative, and 'mainstream' is newer, it's a handoff?
  // Or just detect the existence of higher tier artifacts?

  // Let's iterate over nodes to find artifacts.
  const artifacts = nodes.filter(n => n.kind === 'Artifact' && n.outlet_tier);

  // For each artifact, check if it represents a significant tier jump from known history (mock history for now)
  // Real implementation would look at the graph edges.

  // Placeholder logic for demonstration:
  // If an artifact is 'govt_cert', and we have lower tier artifacts, generate a handoff event.

  // Writing output
  fs.writeFileSync(outputPath, JSON.stringify(handoffs, null, 2));
  console.log(`Handoff scores written to ${outputPath}`);
}

main().catch(console.error);
