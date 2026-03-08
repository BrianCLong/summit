"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateManifest = generateManifest;
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const schema_js_1 = require("./schema.js");
async function getFiles(dir) {
    const dirents = await fs_1.promises.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(dirents.map((dirent) => {
        const res = path_1.default.resolve(dir, dirent.name);
        return dirent.isDirectory() ? getFiles(res) : res;
    }));
    return Array.prototype.concat(...files);
}
async function getFileHash(filePath) {
    const fileBuffer = await fs_1.promises.readFile(filePath);
    return (0, crypto_1.createHash)('sha256').update(fileBuffer).digest('hex');
}
async function generateManifest(exportDir, data) {
    const filePaths = await getFiles(exportDir);
    const files = {};
    for (const filePath of filePaths) {
        const relativePath = path_1.default.relative(exportDir, filePath);
        // Skip the manifest file itself
        if (relativePath === 'manifest.json') {
            continue;
        }
        const [hash, stats] = await Promise.all([
            getFileHash(filePath),
            fs_1.promises.stat(filePath),
        ]);
        files[relativePath] = { hash, size: stats.size };
    }
    const manifest = {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        metadata: data.metadata || {},
        files,
        lineage: data.lineage || [],
    };
    schema_js_1.manifestSchema.parse(manifest);
    const manifestPath = path_1.default.join(exportDir, 'manifest.json');
    await fs_1.promises.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    return manifest;
}
