"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPlugins = listPlugins;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const validator_js_1 = require("../sdk/validator.js");
async function listPlugins(pluginsDir) {
    if (!fs_1.default.existsSync(pluginsDir)) {
        console.error(`Plugins directory not found: ${pluginsDir}`);
        return;
    }
    const entries = fs_1.default.readdirSync(pluginsDir, { withFileTypes: true });
    const plugins = [];
    for (const entry of entries) {
        if (entry.isDirectory()) {
            const manifestPath = path_1.default.join(pluginsDir, entry.name, 'plugin.json');
            if (fs_1.default.existsSync(manifestPath)) {
                try {
                    const content = fs_1.default.readFileSync(manifestPath, 'utf-8');
                    const json = JSON.parse(content);
                    const result = validator_js_1.ManifestValidator.validate(json);
                    if (result.success) {
                        plugins.push({ dir: entry.name, ...result.data });
                    }
                    else {
                        plugins.push({ dir: entry.name, error: 'Invalid Manifest', details: result.errors });
                    }
                }
                catch (e) {
                    plugins.push({ dir: entry.name, error: 'Read/Parse Error' });
                }
            }
        }
    }
    console.log('Detected Plugins:');
    console.table(plugins.map(p => {
        if ('error' in p)
            return { Directory: p.dir, Status: 'INVALID', Error: p.error };
        return {
            Directory: p.dir,
            Name: p.name,
            Version: p.version,
            Type: p.type,
            Risk: p.riskLevel
        };
    }));
}
// Simple CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
    const targetDir = process.argv[2] || './plugins'; // Default to a local plugins folder
    listPlugins(targetDir);
}
