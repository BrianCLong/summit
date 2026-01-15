import { AgentRegistryLoader } from '../../packages/agent-registry/src/loader';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REGISTRY_DIR = path.resolve(__dirname, '../../agents/registry');

async function main() {
    console.log(`Verifying agent specs in ${REGISTRY_DIR}...`);

    if (!fs.existsSync(REGISTRY_DIR)) {
        console.error(`Registry directory does not exist: ${REGISTRY_DIR}`);
        process.exit(1);
    }

    const loader = new AgentRegistryLoader();
    const entries = loader.loadRegistry(REGISTRY_DIR);

    let hasErrors = false;
    let validCount = 0;

    for (const entry of entries) {
        if (!entry.valid) {
            console.error(`\u274C ${path.basename(entry.filePath)} is INVALID:`);
            entry.errors.forEach(err => console.error(`  - ${err}`));
            hasErrors = true;
        } else {
            console.log(`\u2705 ${path.basename(entry.filePath)} is valid.`);
            validCount++;
        }
    }

    console.log(`\nSummary: ${validCount} valid, ${entries.length - validCount} invalid.`);

    if (hasErrors) {
        process.exit(1);
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
