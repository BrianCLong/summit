"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePlugin = validatePlugin;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const validator_js_1 = require("../sdk/validator.js");
async function validatePlugin(pluginPath) {
    const manifestPath = path_1.default.join(pluginPath, 'plugin.json'); // Assumption: manifest is plugin.json
    if (!fs_1.default.existsSync(manifestPath)) {
        console.error(`Error: No manifest found at ${manifestPath}`);
        return false;
    }
    try {
        const content = fs_1.default.readFileSync(manifestPath, 'utf-8');
        const json = JSON.parse(content);
        const result = validator_js_1.ManifestValidator.validate(json);
        if (result.success) {
            console.log(`✅ Plugin '${result.data.name}' v${result.data.version} is valid.`);
            return true;
        }
        else {
            console.error(`❌ Manifest validation failed:`);
            result.errors?.forEach(e => console.error(`   - ${e}`));
            return false;
        }
    }
    catch (e) {
        console.error(`❌ Error reading or parsing manifest: ${e.message}`);
        return false;
    }
}
// Simple CLI entry point if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const targetPath = process.argv[2] || '.';
    validatePlugin(targetPath);
}
