"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
// Configuration
const ROOT_DIR = path_1.default.resolve(__dirname, '../../');
const OUTPUT_DIR = path_1.default.join(ROOT_DIR, 'artifacts/evidence/governance');
const OUTPUT_FILE = path_1.default.join(OUTPUT_DIR, 'ai-inventory.json');
// Patterns to look for
const MODEL_EXTENSIONS = ['.onnx', '.pt', '.bin', '.gguf', '.h5', '.tflite'];
const CONFIG_FILES = ['Modelfile', 'litellm_config.yaml', 'config.yaml'];
const TAG_MARKER = '@ai-system';
const inventory = [];
// Recursive file scanner
function scanDirectory(dir) {
    const entries = fs_1.default.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path_1.default.join(dir, entry.name);
        const relativePath = path_1.default.relative(ROOT_DIR, fullPath);
        // Skip node_modules, .git, dist, etc.
        if (entry.isDirectory()) {
            if (['node_modules', '.git', 'dist', 'build', 'artifacts', 'coverage'].includes(entry.name)) {
                continue;
            }
            scanDirectory(fullPath);
        }
        else if (entry.isFile()) {
            checkFile(fullPath, relativePath, entry.name);
        }
    }
}
function checkFile(fullPath, relativePath, fileName) {
    // 1. Check Extensions
    const ext = path_1.default.extname(fileName).toLowerCase();
    if (MODEL_EXTENSIONS.includes(ext)) {
        inventory.push({
            id: `model-${inventory.length + 1}`,
            type: 'model_file',
            path: relativePath,
            description: `Model weight file: ${fileName}`
        });
        return;
    }
    // 2. Check Config Files
    if (CONFIG_FILES.includes(fileName)) {
        inventory.push({
            id: `config-${inventory.length + 1}`,
            type: 'config',
            path: relativePath,
            description: `AI Configuration file: ${fileName}`
        });
        // We could read the file here to parse details
        return;
    }
    // 3. Check for Code Tags (text files only)
    if (['.ts', '.js', '.tsx', '.jsx', '.py', '.md'].includes(ext)) {
        try {
            const content = fs_1.default.readFileSync(fullPath, 'utf-8');
            if (content.includes(TAG_MARKER)) {
                // Extract description if possible: @ai-system: Description
                const match = content.match(/@ai-system:?\s*(.*)/);
                const description = match ? match[1].trim() : 'Tagged AI System code';
                inventory.push({
                    id: `code-${inventory.length + 1}`,
                    type: 'code_reference',
                    path: relativePath,
                    description: description
                });
            }
        }
        catch (e) {
            // Ignore read errors
        }
    }
}
// Main execution
function main() {
    console.log(`Starting AI Inventory Scan from: ${ROOT_DIR}`);
    if (!fs_1.default.existsSync(OUTPUT_DIR)) {
        fs_1.default.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    scanDirectory(ROOT_DIR);
    const report = {
        generated_at: new Date().toISOString(),
        total_items: inventory.length,
        items: inventory
    };
    fs_1.default.writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2));
    console.log(`Inventory generated: ${OUTPUT_FILE} (${inventory.length} items found)`);
}
main();
