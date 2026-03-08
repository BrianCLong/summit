"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvidenceBundler = void 0;
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
class EvidenceBundler {
    sessionDir;
    constructor(sessionDir) {
        this.sessionDir = sessionDir;
    }
    async createBundle() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const bundleDir = node_path_1.default.join(this.sessionDir, 'evidence', timestamp);
        await (0, promises_1.mkdir)(bundleDir, { recursive: true });
        const files = await this.collectFiles(this.sessionDir);
        const copiedFiles = [];
        for (const file of files) {
            const relative = node_path_1.default.relative(this.sessionDir, file);
            const destination = node_path_1.default.join(bundleDir, relative);
            await (0, promises_1.mkdir)(node_path_1.default.dirname(destination), { recursive: true });
            await (0, promises_1.copyFile)(file, destination);
            copiedFiles.push(relative);
        }
        const manifest = {
            sessionId: node_path_1.default.basename(this.sessionDir),
            createdAt: new Date().toISOString(),
            files: copiedFiles,
        };
        const manifestPath = node_path_1.default.join(bundleDir, 'manifest.json');
        await (0, promises_1.writeFile)(manifestPath, JSON.stringify(manifest, null, 2));
        return bundleDir;
    }
    async collectFiles(dir) {
        const entries = await (0, promises_1.readdir)(dir);
        const files = [];
        for (const entry of entries) {
            if (entry === 'evidence') {
                continue;
            }
            const fullPath = node_path_1.default.join(dir, entry);
            const entryStat = await (0, promises_1.stat)(fullPath);
            if (entryStat.isDirectory()) {
                files.push(...(await this.collectFiles(fullPath)));
            }
            else {
                files.push(fullPath);
            }
        }
        return files;
    }
}
exports.EvidenceBundler = EvidenceBundler;
