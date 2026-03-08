"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const EVIDENCE_INDEX_PATH = 'docs/compliance/EVIDENCE_INDEX.md';
console.log('Verifying Compliance Evidence Drift...');
if (!fs_1.default.existsSync(EVIDENCE_INDEX_PATH)) {
    console.error(`ERROR: Evidence Index not found at ${EVIDENCE_INDEX_PATH}`);
    process.exit(1);
}
const evidenceContent = fs_1.default.readFileSync(EVIDENCE_INDEX_PATH, 'utf-8');
const lines = evidenceContent.split('\n');
let errorCount = 0;
lines.forEach((line, index) => {
    if (!line.trim().startsWith('|') || line.includes('---') || line.includes('Control ID')) {
        return;
    }
    const columns = line.split('|').map(c => c.trim()).filter(c => c !== '');
    if (columns.length < 4)
        return;
    // Col 3: Location / Artifact
    const location = columns[3];
    // Check if the location is a file and if it exists
    if (!location.includes(' ') && !location.startsWith('http')) {
        const cleanPath = location.replace(/`/g, '');
        if (cleanPath.endsWith('/')) {
            if (!fs_1.default.existsSync(cleanPath) && !fs_1.default.existsSync(path_1.default.resolve(process.cwd(), cleanPath))) {
                console.error(`DRIFT ERROR: Directory not found: ${cleanPath} (Line ${index + 1})`);
                errorCount++;
            }
        }
        else {
            if (!fs_1.default.existsSync(cleanPath) && !fs_1.default.existsSync(path_1.default.resolve(process.cwd(), cleanPath))) {
                console.error(`DRIFT ERROR: File not found: ${cleanPath} (Line ${index + 1})`);
                errorCount++;
            }
        }
    }
});
if (errorCount > 0) {
    console.error(`FAILED: Found ${errorCount} evidence artifacts missing.`);
    process.exit(1);
}
console.log('SUCCESS: All checked evidence artifacts exist.');
