"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRunManifest = generateRunManifest;
exports.saveRunManifest = saveRunManifest;
exports.loadRunManifest = loadRunManifest;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
/**
 * Generate a run manifest object.
 */
function generateRunManifest(runId, seed, options = {}) {
    return {
        run_id: runId,
        seed_values: { global_seed: seed },
        created_at: new Date().toISOString(),
        ...options
    };
}
/**
 * Save the run manifest to a file.
 * Typically saved in the run directory (e.g. ~/.summit/runs/{runId}/manifest.json)
 */
async function saveRunManifest(manifest, filePath) {
    await fs_extra_1.default.ensureDir(path_1.default.dirname(filePath));
    await fs_extra_1.default.writeJSON(filePath, manifest, { spaces: 2 });
}
/**
 * Load a run manifest from a file.
 */
async function loadRunManifest(filePath) {
    if (!await fs_extra_1.default.pathExists(filePath)) {
        throw new Error(`Manifest not found at ${filePath}`);
    }
    return fs_extra_1.default.readJSON(filePath);
}
