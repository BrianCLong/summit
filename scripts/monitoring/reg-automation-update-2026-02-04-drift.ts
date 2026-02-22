import { buildRegulatoryArtifacts } from '../../cli/src/lib/regulatory/builder.js';
import { diffRegulatoryArtifacts } from '../../cli/src/lib/regulatory/diff.js';
import { upsertGitHubIssue } from './lib/github_issue_upsert.js';
import * as path from 'path';
import * as fs from 'fs';

async function main() {
    const currentDir = path.resolve('artifacts/regulatory');
    // For MWS, we treat the committed artifacts as baseline?
    // Or we fetch baseline from main branch?
    // Let's assume baseline is in 'artifacts/regulatory' (committed) and we build to 'artifacts/regulatory-new'

    const baselineDir = path.resolve('artifacts/regulatory');
    const newDir = path.resolve('artifacts/regulatory-new');

    console.log('Building fresh artifacts...');
    await buildRegulatoryArtifacts(newDir);

    console.log('Diffing against baseline...');
    const diff = await diffRegulatoryArtifacts(newDir, baselineDir);

    if (Object.keys(diff).length > 0) {
        console.log('Drift detected:', diff);
        await upsertGitHubIssue('Regulatory Drift Detected', `Drift found:\n\`\`\`json\n${JSON.stringify(diff, null, 2)}\n\`\`\``);
        // Fail if critical?
    } else {
        console.log('No drift.');
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
