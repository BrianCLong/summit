import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

interface ProvEntity {
    'prov:type': string | string[];
    'summit:sha256'?: string;
    [key: string]: any;
}

interface ProvActivity {
    'prov:startTime': string;
    'prov:endTime': string;
    'summit:runId': string;
    [key: string]: any;
}

interface ProvDocument {
    prefix: { [key: string]: string };
    entity: { [key: string]: ProvEntity };
    activity: { [key: string]: ProvActivity };
    agent: { [key: string]: any };
    wasGeneratedBy: { [key: string]: { 'prov:entity': string; 'prov:activity': string; 'prov:time': string } };
    wasAssociatedWith: { [key: string]: { 'prov:activity': string; 'prov:agent': string } };
}

const ARTIFACTS_DIR = process.env.ARTIFACTS_DIR || 'artifacts';
const PROV_OUTPUT_FILE = process.env.PROV_OUTPUT_FILE || 'artifacts/provenance/summit.prov.json';
const GITHUB_RUN_ID = process.env.GITHUB_RUN_ID || 'local-run';
const GITHUB_ACTOR = process.env.GITHUB_ACTOR || 'local-user';

function calculateHash(filePath: string): string {
    if (!fs.existsSync(filePath)) return '';
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
}

function generateProv() {
    const startTime = new Date().toISOString();

    // Ensure output dir exists
    const outputDir = path.dirname(PROV_OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const provSelect: ProvDocument = {
        prefix: {
            "prov": "http://www.w3.org/ns/prov#",
            "summit": "https://summit.intelgraph.io/ns/"
        },
        entity: {},
        activity: {},
        agent: {},
        wasGeneratedBy: {},
        wasAssociatedWith: {}
    };

    // Define Activity (The CI Run)
    const activityId = `activity:${GITHUB_RUN_ID}`;
    provSelect.activity[activityId] = {
        "prov:startTime": startTime,
        "prov:endTime": startTime, // Placeholder, updated at end? Or just synchronous.
        "summit:runId": GITHUB_RUN_ID
    };

    // Define Agent (Github Actions User)
    const agentId = `agent:${GITHUB_ACTOR}`;
    provSelect.agent[agentId] = {
        "prov:type": "prov:Person",
        "prov:label": GITHUB_ACTOR
    };

    // Association
    const assocId = `assoc:${GITHUB_RUN_ID}`;
    provSelect.wasAssociatedWith[assocId] = {
        "prov:activity": activityId,
        "prov:agent": agentId
    };

    // Scan for artifacts
    if (fs.existsSync(ARTIFACTS_DIR)) {
        const files = fs.readdirSync(ARTIFACTS_DIR, { recursive: true }) as string[];

        files.forEach(file => {
            const fullPath = path.join(ARTIFACTS_DIR, file);
            if (fs.statSync(fullPath).isFile() && !file.endsWith('.prov.json')) {
                const hash = calculateHash(fullPath);
                const entityId = `entity:${path.basename(file)}`;

                provSelect.entity[entityId] = {
                    "prov:type": "summit:Artifact",
                    "summit:sha256": hash
                };

                const genId = `gen:${path.basename(file)}`;
                provSelect.wasGeneratedBy[genId] = {
                    "prov:entity": entityId,
                    "prov:activity": activityId,
                    "prov:time": new Date().toISOString()
                };
            }
        });
    }

    provSelect.activity[activityId]['prov:endTime'] = new Date().toISOString();

    // Deterministic Stringify (Key Sorting)
    const jsonString = JSON.stringify(provSelect, Object.keys(provSelect).sort(), 2);

    fs.writeFileSync(PROV_OUTPUT_FILE, jsonString);
    console.log(`PROV-JSON written to ${PROV_OUTPUT_FILE}`);
}

generateProv();
