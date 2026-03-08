"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTemplateDir = getTemplateDir;
exports.getOutputDir = getOutputDir;
exports.getMonorepoRoot = getMonorepoRoot;
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
/**
 * Get the template directory for a given service type
 */
function getTemplateDir(type) {
    // First check local templates directory
    const localTemplates = path_1.default.join(__dirname, '../../templates', type);
    // Then check installed package templates
    const packageTemplates = path_1.default.resolve(__dirname, '../../../templates', type);
    return localTemplates;
}
/**
 * Get the output directory for a new service
 */
function getOutputDir(type, name) {
    const cwd = process.cwd();
    // Determine the appropriate subdirectory based on type
    const typeToDir = {
        'api-service': 'services',
        worker: 'services',
        'batch-job': 'pipelines',
        'data-service': 'services',
        frontend: 'apps',
        library: 'packages',
    };
    const subdir = typeToDir[type] || 'services';
    return path_1.default.join(cwd, subdir, name);
}
/**
 * Get the root directory of the monorepo
 */
function getMonorepoRoot() {
    let dir = process.cwd();
    while (dir !== '/') {
        const pnpmWorkspace = path_1.default.join(dir, 'pnpm-workspace.yaml');
        const packageJson = path_1.default.join(dir, 'package.json');
        try {
            const fs = require('fs');
            if (fs.existsSync(pnpmWorkspace)) {
                return dir;
            }
        }
        catch {
            // Continue searching
        }
        dir = path_1.default.dirname(dir);
    }
    return process.cwd();
}
