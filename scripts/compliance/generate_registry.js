"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const registryPath = path_1.default.join(process.cwd(), 'governance/registry.json');
const governanceDir = path_1.default.join(process.cwd(), 'governance');
function calculateHash(filepath) {
    const content = fs_1.default.readFileSync(filepath, 'utf-8');
    return crypto_1.default.createHash('sha256').update(content).digest('hex');
}
function scanDirectory(dir, type) {
    if (!fs_1.default.existsSync(dir))
        return [];
    const artifacts = [];
    const files = fs_1.default.readdirSync(dir);
    for (const file of files) {
        if (file.endsWith('.json') && file !== 'registry.json') {
            const filepath = path_1.default.join(dir, file);
            artifacts.push({
                id: crypto_1.default.randomUUID(),
                type: type,
                name: file,
                path: path_1.default.relative(process.cwd(), filepath),
                hash: calculateHash(filepath),
                state: 'approved' // Defaulting to approved for existing governed artifacts
            });
        }
    }
    return artifacts;
}
const artifacts = [
    ...scanDirectory(governanceDir, 'governance_config'),
    // ...scanDirectory(path.join(process.cwd(), 'policy'), 'policy')
];
const registry = {
    version: "1.0.0",
    generated_at: new Date().toISOString(),
    artifacts: artifacts
};
fs_1.default.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
console.log(`✅ Registry generated with ${artifacts.length} artifacts.`);
