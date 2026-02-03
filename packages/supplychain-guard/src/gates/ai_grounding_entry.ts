import fs from 'fs';
import { runGate } from '../runner.js';
import { evaluateAIGrounding, UpgradeRec } from './ai_grounding.js';

async function main() {
  await runGate('ai-upgrade-grounding', async () => {
    let recs: UpgradeRec[] = [];

    // In a real flow, this would come from an AI agent's output artifact
    const recsFile = process.env.AI_RECS_FILE || 'ai-recommendations.json';

    if (fs.existsSync(recsFile)) {
        console.log(`Loading recommendations from ${recsFile}`);
        try {
            recs = JSON.parse(fs.readFileSync(recsFile, 'utf-8'));
        } catch (e) {
            console.error('Failed to parse recommendations file');
            return { ok: false, findings: ['Invalid JSON in recommendations file'] };
        }
    } else {
        console.log('No recommendations file found, skipping grounding check (pass).');
    }

    // For testing purposes
    if (process.env.TEST_FAIL_AI_GATE) {
        recs.push({ name: 'this-package-does-not-exist-at-all-12345', version: '9.9.9', ecosystem: 'npm' });
    }

    return evaluateAIGrounding(recs);
  });
}

main();
