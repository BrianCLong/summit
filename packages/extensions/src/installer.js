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
exports.ExtensionInstaller = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const types_js_1 = require("./types.js");
class ExtensionInstaller {
    installDir;
    auditFile;
    constructor(options) {
        this.installDir = options.installDir;
        this.auditFile = options.auditFile;
    }
    getInstallDir() {
        return this.installDir;
    }
    async install(sourcePath) {
        const manifest = await this.readManifest(sourcePath);
        const target = path.join(this.installDir, manifest.name);
        await this.copyExtension(sourcePath, target);
        await this.writeAudit({ action: 'install', name: manifest.name, version: manifest.version, timestamp: new Date().toISOString() });
        return manifest;
    }
    async update(sourcePath) {
        const manifest = await this.readManifest(sourcePath);
        const target = path.join(this.installDir, manifest.name);
        const backup = `${target}-${manifest.version}.bak`;
        if (await this.exists(target)) {
            await fs.rm(backup, { recursive: true, force: true });
            await fs.rename(target, backup);
        }
        await this.copyExtension(sourcePath, target);
        await this.writeAudit({
            action: 'update',
            name: manifest.name,
            version: manifest.version,
            timestamp: new Date().toISOString(),
            details: { backup },
        });
        return manifest;
    }
    async rollback(name, version) {
        const target = path.join(this.installDir, name);
        const backup = `${target}-${version}.bak`;
        if (!(await this.exists(backup))) {
            throw new Error(`No backup found for ${name}@${version}`);
        }
        await fs.rm(target, { recursive: true, force: true });
        await fs.rename(backup, target);
        await this.writeAudit({ action: 'rollback', name, version, timestamp: new Date().toISOString() });
    }
    async uninstall(name) {
        const target = path.join(this.installDir, name);
        await fs.rm(target, { recursive: true, force: true });
        const existsAfter = await this.exists(target);
        if (existsAfter) {
            throw new Error(`Cleanup verification failed for ${name}`);
        }
        await this.writeAudit({ action: 'uninstall', name, version: 'unknown', timestamp: new Date().toISOString() });
    }
    async getAuditLog() {
        try {
            const content = await fs.readFile(this.auditFile, 'utf-8');
            return content
                .trim()
                .split('\n')
                .filter(Boolean)
                .map((line) => JSON.parse(line));
        }
        catch {
            return [];
        }
    }
    async copyExtension(source, target) {
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.rm(target, { recursive: true, force: true });
        await fs.cp(source, target, { recursive: true });
    }
    async writeAudit(entry) {
        await fs.mkdir(path.dirname(this.auditFile), { recursive: true });
        await fs.appendFile(this.auditFile, `${JSON.stringify(entry)}\n`);
    }
    async readManifest(extensionPath) {
        const manifestPath = path.join(extensionPath, 'extension.json');
        const content = await fs.readFile(manifestPath, 'utf-8');
        const parsed = JSON.parse(content);
        const validated = types_js_1.ExtensionManifestSchema.safeParse(parsed);
        if (!validated.success) {
            throw new Error(`Invalid extension manifest: ${validated.error.message}`);
        }
        return validated.data;
    }
    async exists(target) {
        try {
            await fs.access(target);
            return true;
        }
        catch {
            return false;
        }
    }
}
exports.ExtensionInstaller = ExtensionInstaller;
