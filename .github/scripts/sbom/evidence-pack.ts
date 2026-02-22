import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

function main() {
    const artifactDir = process.env.ARTIFACT_DIR || 'artifacts/sbom';
    if (!fs.existsSync(artifactDir)) {
        fs.mkdirSync(artifactDir, { recursive: true });
    }

    let files: string[] = [];
    if (fs.existsSync(artifactDir)) {
         files = fs.readdirSync(artifactDir).filter(f => f.endsWith('.json') && f !== 'stamp.json' && f !== 'report.json');
    }

    const manifest: any = {};

    files.forEach(f => {
        const content = fs.readFileSync(path.join(artifactDir, f), 'utf8');
        const hash = crypto.createHash('sha256').update(content).digest('hex');
        manifest[f] = {
            sha256: hash,
            size: content.length
        };
    });

    const stamp = {
        build_id: process.env.GITHUB_RUN_ID || 'local',
        commit: process.env.GITHUB_SHA || 'unknown',
        evidenceId: "EVID:pack-stamp",
        manifest: manifest
    };

    fs.writeFileSync(path.join(artifactDir, 'stamp.json'), JSON.stringify(stamp, Object.keys(stamp).sort(), 2));
    console.log("Evidence pack created at " + artifactDir);
}

main();
