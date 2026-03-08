"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const REGISTRY_PATH = 'prompts/registry.yaml';
const ROOT_DIR = process.cwd();
function calculateSha256(filePath) {
    const content = fs_1.default.readFileSync(filePath, 'utf-8');
    return crypto_1.default.createHash('sha256').update(content).digest('hex');
}
function updateRegistry() {
    const fullRegistryPath = path_1.default.join(ROOT_DIR, REGISTRY_PATH);
    if (!fs_1.default.existsSync(fullRegistryPath)) {
        console.error(`Registry not found at ${fullRegistryPath}`);
        process.exit(1);
    }
    const fileContent = fs_1.default.readFileSync(fullRegistryPath, 'utf-8');
    const registry = js_yaml_1.default.load(fileContent);
    let updatedCount = 0;
    registry.prompts.forEach((entry) => {
        const promptPath = path_1.default.join(ROOT_DIR, entry.path);
        if (fs_1.default.existsSync(promptPath)) {
            const currentHash = calculateSha256(promptPath);
            if (currentHash !== entry.sha256) {
                console.log(`Updating hash for ${entry.id} (${entry.path})`);
                entry.sha256 = currentHash;
                updatedCount++;
            }
        }
        else {
            console.warn(`Warning: Prompt file not found: ${entry.path}`);
        }
    });
    if (updatedCount > 0) {
        const newContent = js_yaml_1.default.dump(registry, { indent: 2, lineWidth: -1 });
        fs_1.default.writeFileSync(fullRegistryPath, newContent, 'utf-8');
        console.log(`Updated ${updatedCount} prompt hashes in registry.`);
    }
    else {
        console.log('No prompt hashes needed updating.');
    }
}
updateRegistry();
