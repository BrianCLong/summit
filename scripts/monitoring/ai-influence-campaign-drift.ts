import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function checkDrift() {
  const tacticsPath = path.join(__dirname, '../../config/ontology/ai-influence-campaign/tactics.catalog.json');
  const techniquesPath = path.join(__dirname, '../../config/ontology/ai-influence-campaign/techniques.catalog.json');
  const fixturesDir = path.join(__dirname, '../../config/ontology/ai-influence-campaign/fixtures');

  const tacticsContent = JSON.parse(fs.readFileSync(tacticsPath, 'utf8'));
  const tacticsSet = new Set(tacticsContent.map((t: any) => t.id));

  const techniquesContent = JSON.parse(fs.readFileSync(techniquesPath, 'utf8'));
  const techniquesSet = new Set(techniquesContent.map((t: any) => t.id));

  let driftDetected = false;
  const unknownTactics = new Set<string>();
  const unknownTechniques = new Set<string>();

  const fixtureFiles = fs.readdirSync(fixturesDir).filter(f => f.endsWith('.json'));

  fixtureFiles.forEach(f => {
    const filePath = path.join(fixturesDir, f);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    if (content.tactics) {
      content.tactics.forEach((t: any) => {
        if (!tacticsSet.has(t.tactic_id)) {
          driftDetected = true;
          unknownTactics.add(t.tactic_id);
        }

        if (t.technique_ids) {
          t.technique_ids.forEach((techniqueId: string) => {
            if (!techniquesSet.has(techniqueId)) {
              driftDetected = true;
              unknownTechniques.add(techniqueId);
            }
          });
        }
      });
    }
  });

  if (driftDetected) {
    console.error('Drift detected in AI Influence Campaign Ontology:');
    if (unknownTactics.size > 0) {
      console.error(`Unknown tactics used in fixtures: ${Array.from(unknownTactics).join(', ')}`);
    }
    if (unknownTechniques.size > 0) {
      console.error(`Unknown techniques used in fixtures: ${Array.from(unknownTechniques).join(', ')}`);
    }
    process.exit(1);
  } else {
    console.log('No drift detected. All tactics and techniques are registered.');
  }
}

// Execute when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  checkDrift();
}
