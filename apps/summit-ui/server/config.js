"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PATHS = exports.PORT = exports.REPO_ROOT = void 0;
const path_1 = require("path");
const url_1 = require("url");
const __dirname = (0, url_1.fileURLToPath)(new URL('.', import.meta.url));
// Resolve repo root: apps/summit-ui/server -> ../../.. -> repo root
// SUMMIT_REPO_ROOT env var overrides for testing.
exports.REPO_ROOT = process.env.SUMMIT_REPO_ROOT ?? (0, path_1.resolve)(__dirname, '../../..');
exports.PORT = Number(process.env.SUMMIT_UI_PORT ?? 3741);
exports.PATHS = {
    agenticPrompts: (0, path_1.join)(exports.REPO_ROOT, '.agentic-prompts'),
    claude: (0, path_1.join)(exports.REPO_ROOT, '.claude'),
    jules: (0, path_1.join)(exports.REPO_ROOT, '.jules'),
    artifactsPr: (0, path_1.join)(exports.REPO_ROOT, '.artifacts', 'pr'),
    ciPolicies: (0, path_1.join)(exports.REPO_ROOT, '.ci', 'policies'),
    ciScripts: (0, path_1.join)(exports.REPO_ROOT, '.ci', 'scripts'),
    artifacts: (0, path_1.join)(exports.REPO_ROOT, '.artifacts'),
};
