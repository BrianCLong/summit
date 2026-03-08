"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
function loadConfig(configPath) {
    const resolvedPath = node_path_1.default.resolve(configPath);
    if (!node_fs_1.default.existsSync(resolvedPath)) {
        throw new Error(`Gate config not found at ${resolvedPath}`);
    }
    const raw = node_fs_1.default.readFileSync(resolvedPath, 'utf-8');
    const parsed = JSON.parse(raw);
    const normalized = normalizeConfig(parsed);
    validateConfig(normalized);
    return normalized;
}
function normalizeConfig(config) {
    return {
        workflowGate: config.workflowGate ?? {
            workflowGlobs: [],
            enforcePinnedActions: true,
            enforceMinimumPermissions: { contents: 'read' }
        },
        imageGate: config.imageGate ?? { stageImages: [] },
        secretScan: config.secretScan ?? { paths: [], excludedGlobs: [], allowPatterns: [] },
        policyGate: config.policyGate ?? {
            inputPath: '',
            denyWildcardIam: true,
            allowPublicEndpoints: false
        }
    };
}
function validateConfig(config) {
    if (!config.workflowGate.workflowGlobs.length) {
        throw new Error('workflowGate.workflowGlobs must include at least one glob');
    }
    if (!config.imageGate.stageImages.length) {
        throw new Error('imageGate.stageImages must list at least one image requirement');
    }
    if (!config.secretScan.paths.length) {
        throw new Error('secretScan.paths must include at least one path to scan');
    }
    if (!config.policyGate.inputPath) {
        throw new Error('policyGate.inputPath is required');
    }
}
