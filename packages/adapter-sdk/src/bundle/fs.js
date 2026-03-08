"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readJsonFile = readJsonFile;
exports.writeJson = writeJson;
exports.hashFile = hashFile;
exports.hashDirectory = hashDirectory;
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const types_js_1 = require("./types.js");
async function readJsonFile(filePath) {
    const raw = await node_fs_1.promises.readFile(filePath, 'utf-8');
    try {
        return JSON.parse(raw);
    }
    catch (error) {
        throw new types_js_1.BundleValidationError(`Invalid JSON in ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
}
async function writeJson(filePath, value) {
    await node_fs_1.promises.writeFile(filePath, JSON.stringify(value, null, 2));
}
async function hashFile(filePath) {
    const hash = (0, node_crypto_1.createHash)('sha256');
    const file = await node_fs_1.promises.readFile(filePath);
    hash.update(file);
    return hash.digest('hex');
}
async function hashDirectory(root) {
    const hash = (0, node_crypto_1.createHash)('sha256');
    async function walk(current) {
        const entries = await node_fs_1.promises.readdir(current, { withFileTypes: true });
        entries.sort((a, b) => a.name.localeCompare(b.name));
        for (const entry of entries) {
            const fullPath = node_path_1.default.join(current, entry.name);
            if (entry.isDirectory()) {
                await walk(fullPath);
            }
            else if (entry.isFile()) {
                const relative = node_path_1.default.relative(root, fullPath);
                hash.update(relative);
                const content = await node_fs_1.promises.readFile(fullPath);
                hash.update(content);
            }
        }
    }
    await walk(root);
    return hash.digest('hex');
}
