
import fs from 'fs';
import path from 'path';

const registryPath = path.join(process.cwd(), 'governance/registry.json');

if (!fs.existsSync(registryPath)) {
    console.error('❌ Registry not found. Run generate_registry.ts first.');
    process.exit(1);
}

const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
let failed = false;

// Simulated environment check (e.g., if we are in production)
const isProduction = process.env.NODE_ENV === 'production' || process.env.CI_BRANCH === 'main';

console.log(`Verifying ${registry.artifacts.length} artifacts... (Env: ${isProduction ? 'PROD' : 'DEV'})`);

for (const artifact of registry.artifacts) {
    if (isProduction && artifact.state === 'draft') {
        console.error(`❌ Artifact ${artifact.name} is in DRAFT state in production environment.`);
        failed = true;
    }

    if (artifact.state === 'retired') {
        console.warn(`⚠️ Artifact ${artifact.name} is RETIRED.`);
    }
}

if (failed) {
    process.exit(1);
}

console.log('✅ Governance State Verification Passed');
