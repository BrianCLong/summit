"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CursorAdapter = void 0;
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const fs = __importStar(require("fs-extra"));
class CursorAdapter {
    name = 'cursor';
    async detect() {
        // Basic detection logic: check for cursor config dir
        const homeDir = os.homedir();
        // Common paths for Cursor
        const pathsToCheck = [
            path.join(homeDir, '.cursor'),
            path.join(homeDir, 'Library', 'Application Support', 'Cursor'), // macOS
            path.join(homeDir, '.config', 'Cursor'), // Linux
            path.join(homeDir, 'AppData', 'Roaming', 'Cursor') // Windows
        ];
        for (const p of pathsToCheck) {
            if (await fs.pathExists(p)) {
                return true;
            }
        }
        return false;
    }
    getExtensionDir() {
        const homeDir = os.homedir();
        // Default location for many setups
        return path.join(homeDir, '.cursor', 'extensions');
    }
    async getInstallTarget(skill) {
        const extensionDir = this.getExtensionDir();
        // We could add more sophisticated discovery here (e.g. checking specific OS paths)
        // but for now we default to ~/.cursor/extensions and create it if missing.
        return {
            tool: 'cursor',
            scope: 'user',
            mode: 'copy', // Enforced policy for Cursor
            location: path.join(extensionDir, skill.manifest.name)
        };
    }
    async install(skill, target) {
        if (target.mode !== 'copy') {
            throw new Error(`CursorAdapter only supports 'copy' mode, but '${target.mode}' was requested.`);
        }
        // Ensure target parent exists
        await fs.ensureDir(path.dirname(target.location));
        // Copy skill files
        // We filter out .git and other non-essential files if needed, but simple copy for now
        await fs.copy(skill.location, target.location, {
            dereference: true,
            filter: (src) => !src.includes('.git') // Basic filter
        });
    }
    async listInstalled() {
        const extensionDir = this.getExtensionDir();
        if (!await fs.pathExists(extensionDir)) {
            return [];
        }
        const results = [];
        const entries = await fs.readdir(extensionDir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory()) {
                const fullPath = path.join(extensionDir, entry.name);
                // Try to read manifest.json (Summit Skill) or package.json (Standard Extension)
                let name = entry.name;
                let version = '0.0.0';
                if (await fs.pathExists(path.join(fullPath, 'manifest.json'))) {
                    try {
                        const manifest = await fs.readJson(path.join(fullPath, 'manifest.json'));
                        name = manifest.name || name;
                        version = manifest.version || version;
                    }
                    catch (e) {
                        // ignore
                    }
                }
                else if (await fs.pathExists(path.join(fullPath, 'package.json'))) {
                    try {
                        const pkg = await fs.readJson(path.join(fullPath, 'package.json'));
                        name = pkg.name || name;
                        version = pkg.version || version;
                    }
                    catch (e) {
                        // ignore
                    }
                }
                const stats = await fs.stat(fullPath);
                results.push({
                    skillId: name,
                    target: {
                        tool: 'cursor',
                        scope: 'user',
                        mode: 'copy',
                        location: fullPath
                    },
                    installedAt: stats.mtime.toISOString(),
                    version
                });
            }
        }
        return results;
    }
}
exports.CursorAdapter = CursorAdapter;
