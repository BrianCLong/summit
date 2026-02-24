
import { IdentityIntrusionSimulator } from '../src/services/simulations/IdentityIntrusionSimulator';
import * as fs from 'fs';
import * as path from 'path';

async function run() {
  console.log('Starting Identity Intrusion Simulation (Unit 83M)...');

  const sim = new IdentityIntrusionSimulator();
  const result = sim.generateCampaign();

  console.log(`Campaign ID: ${result.campaignId}`);
  console.log(`Events Generated: ${result.events.length}`);
  console.log(`Containment Success: ${result.containmentSuccess}`);

  // Output JSONs
  const outDir = path.resolve(process.cwd(), 'server/src/services/simulations/artifacts');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(path.join(outDir, 'campaign_result.json'), JSON.stringify(result, null, 2));
  fs.writeFileSync(path.join(outDir, 'synthetic_logs.json'), JSON.stringify(result.artifacts.logs, null, 2));
  fs.writeFileSync(path.join(outDir, 'playbooks.json'), JSON.stringify(result.artifacts.playbooks, null, 2));
  fs.writeFileSync(path.join(outDir, 'detection_rules.json'), JSON.stringify(result.artifacts.detectionRules, null, 2));

  console.log(`Artifacts written to ${outDir}`);
}

run().catch(console.error);
