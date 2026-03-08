"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const url_1 = require("url");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
const REPORT_PATH = path_1.default.resolve(__dirname, 'execution-governor-drift.report.json');
const FILES_TO_MONITOR = [
    'config/execution_governor.yml',
    'docs/standards/execution-governor.md',
    'scripts/execution/guard_single_product.ts',
    'scripts/execution/scorecard.ts',
    'scripts/execution/checkpoint.ts'
];
function getFileHash(filepath) {
    const fullPath = path_1.default.resolve(__dirname, '../../', filepath);
    if (!fs_1.default.existsSync(fullPath)) {
        return 'MISSING';
    }
    const content = fs_1.default.readFileSync(fullPath);
    return crypto_1.default.createHash('sha256').update(content).digest('hex');
}
function main() {
    const hashes = {};
    for (const file of FILES_TO_MONITOR) {
        hashes[file] = getFileHash(file);
    }
    // Sort keys for determinism
    const sortedHashes = {};
    Object.keys(hashes).sort().forEach(key => {
        sortedHashes[key] = hashes[key];
    });
    fs_1.default.writeFileSync(REPORT_PATH, JSON.stringify(sortedHashes, null, 2));
    console.log(`Drift report generated at ${REPORT_PATH}`);
}
if (process.argv[1] === (0, url_1.fileURLToPath)(import.meta.url)) {
    main();
}
