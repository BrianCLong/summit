import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const FIXTURE_DIR = path.join(process.cwd(), 'GOLDEN', 'datasets', 'cogsec-io-feb2026');
const OUTPUT_DIR = path.join(process.cwd(), 'dist', 'evidence', 'cogsec-fixture');

function generateHash(data: any): string {
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

function ensureDirSync(dirPath: string) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

async function exportFixture() {
    ensureDirSync(OUTPUT_DIR);

    // 1. Read input fixture
    const fixturePath = path.join(FIXTURE_DIR, 'campaign_fixture.json');
    if (!fs.existsSync(fixturePath)) {
        console.error(`Fixture not found at ${fixturePath}`);
        process.exit(1);
    }

    const fixtureData = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

    // 2. Report JSON
    const reportData = {
        campaign: fixtureData.campaign,
        targets: fixtureData.targets,
        narratives: fixtureData.narratives,
        tempo: fixtureData.tempo
    };
    fs.writeFileSync(path.join(OUTPUT_DIR, 'report.json'), JSON.stringify(reportData, null, 2));

    // 3. Metrics JSON
    const metricsData = {
        targetCount: fixtureData.targets.length,
        narrativeCount: fixtureData.narratives.length,
        confidence: fixtureData.campaign.confidence
    };
    fs.writeFileSync(path.join(OUTPUT_DIR, 'metrics.json'), JSON.stringify(metricsData, null, 2));

    // 4. Stamp JSON - MUST be deterministic (no wall-clock timestamps)
    const inputsHash = generateHash(fixtureData);
    const stampData = {
        schemaVersion: "1.0.0",
        inputsHash: inputsHash,
        gitSha: process.env.GIT_COMMIT_SHA || "unknown"
    };
    fs.writeFileSync(path.join(OUTPUT_DIR, 'stamp.json'), JSON.stringify(stampData, null, 2));

    console.log(`Evidence exported successfully to ${OUTPUT_DIR}`);
}

exportFixture().catch(console.error);
