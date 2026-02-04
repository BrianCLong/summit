import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPORT_PATH = path.resolve(__dirname, 'execution-governor-drift.report.json');

const FILES_TO_MONITOR = [
    'config/execution_governor.yml',
    'docs/standards/execution-governor.md',
    'scripts/execution/guard_single_product.ts',
    'scripts/execution/scorecard.ts',
    'scripts/execution/checkpoint.ts'
];

function getFileHash(filepath: string): string {
    const fullPath = path.resolve(__dirname, '../../', filepath);
    if (!fs.existsSync(fullPath)) {
        return 'MISSING';
    }
    const content = fs.readFileSync(fullPath);
    return crypto.createHash('sha256').update(content).digest('hex');
}

function main() {
    const hashes: Record<string, string> = {};

    for (const file of FILES_TO_MONITOR) {
        hashes[file] = getFileHash(file);
    }

    // Sort keys for determinism
    const sortedHashes: Record<string, string> = {};
    Object.keys(hashes).sort().forEach(key => {
        sortedHashes[key] = hashes[key];
    });

    fs.writeFileSync(REPORT_PATH, JSON.stringify(sortedHashes, null, 2));
    console.log(`Drift report generated at ${REPORT_PATH}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main();
}
