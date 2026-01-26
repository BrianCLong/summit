import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

/**
 * generate_provenance.ts
 * Canonical implementation of SLSA v1.1 Provenance Generation.
 * Replaces .ci/gen-provenance.js
 */

interface Hash {
    sha256: string;
}

interface Subject {
    name: string;
    digest: Hash;
}

function calculateSha256(filePath: string): string {
    if (!fs.existsSync(filePath)) return "";
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
}

function getGitInfo() {
    try {
        const commit = process.env.GITHUB_SHA ||
            execSync('git rev-parse HEAD').toString().trim();
        const branch = process.env.GITHUB_REF_NAME ||
            execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
        return { commit, branch };
    } catch (e) {
        return { commit: 'unknown', branch: 'unknown' };
    }
}

function parseSha256Sums(filePath: string): Subject[] {
    if (!fs.existsSync(filePath)) return [];
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.split('\n')
        .filter(Boolean)
        .map(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length < 2) return null;
            const sha256 = parts[0];
            const name = parts.slice(1).join(' ').replace(/^\*?/, '');
            return { name, digest: { sha256 } };
        })
        .filter((s): s is Subject => s !== null);
}

async function main() {
    const outputDir = path.resolve('.evidence');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const provenancePath = path.join(outputDir, 'provenance.json');
    const sha256SumsPath = process.env.SHA256SUMS_PATH || 'dist/release/SHA256SUMS';

    let subjects: Subject[] = parseSha256Sums(sha256SumsPath);

    if (subjects.length === 0) {
        // Fallback to legacy artifacts if SHA256SUMS is missing
        const fallbackFiles = [
            'package.json',
            'pnpm-lock.yaml',
            'dist/server/index.js',
            'dist/client/assets/index.js',
            '.evidence/sbom.json' // Include SBOM as subject
        ].filter(f => fs.existsSync(f));

        subjects = fallbackFiles.map(f => ({
            name: f,
            digest: { sha256: calculateSha256(f) }
        }));
    }

    const { commit, branch } = getGitInfo();

    const provenance = {
        _type: "https://in-toto.io/Statement/v1",
        subject: subjects,
        predicateType: "https://slsa.dev/provenance/v1",
        predicate: {
            buildDefinition: {
                buildType: "https://github.com/BrianCLong/summit/actions/workflow/release",
                externalParameters: {
                    gitCommit: commit,
                    gitBranch: branch,
                    source: {
                        uri: "git+https://github.com/BrianCLong/summit",
                        digest: { sha1: commit }
                    }
                },
                resolvedDependencies: [
                     {
                        uri: "git+https://github.com/BrianCLong/summit",
                        digest: { sha1: commit }
                    }
                ]
            },
            runDetails: {
                builder: { id: "github-actions" },
                metadata: {
                    invocationId: process.env.GITHUB_RUN_ID ? `${process.env.GITHUB_RUN_ID}/${process.env.GITHUB_RUN_ATTEMPT || 1}` : "local-run",
                    startedOn: new Date().toISOString(),
                    finishedOn: new Date().toISOString()
                }
            },
             environment: {
                runnerOs: process.env.RUNNER_OS || "unknown",
                nodeVersion: process.version
            }
        }
    };

    fs.writeFileSync(provenancePath, JSON.stringify(provenance, null, 2));
    console.log(`Provenance generated at ${provenancePath}`);
}

main().catch(console.error);
