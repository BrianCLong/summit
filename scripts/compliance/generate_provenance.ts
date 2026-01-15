import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

/**
 * generate_provenance.ts
 * Minimal implementation to satisfy GA requirements.
 */

function calculateSha256(filePath: string): string {
    if (!fs.existsSync(filePath)) return "";
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
}

async function main() {
    const outputDir = path.resolve('.evidence');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const sbomPath = path.join(outputDir, 'sbom.json');
    const provenancePath = path.join(outputDir, 'provenance.json');

    const provenance = {
        _type: "https://summit.dev/provenance/v1",
        version: "1.0.0",
        build: {
            timestamp: new Date().toISOString(),
            commit: process.env.GITHUB_SHA || "local-dev",
            actor: process.env.GITHUB_ACTOR || "local-user"
        },
        materials: [
            {
                uri: "git+https://github.com/BrianCLong/summit",
                digest: { sha1: process.env.GITHUB_SHA || "unknown" }
            },
            {
                uri: "file://.evidence/sbom.json",
                digest: { sha256: calculateSha256(sbomPath) }
            }
        ],
        env: {
            node_version: process.version,
            platform: process.platform,
            arch: process.arch
        }
    };

    fs.writeFileSync(provenancePath, JSON.stringify(provenance, null, 2));
    console.log(`Provenance generated at ${provenancePath}`);
}

main().catch(console.error);
