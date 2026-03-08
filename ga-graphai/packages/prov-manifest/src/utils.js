"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toCanonicalPath = toCanonicalPath;
exports.hashFile = hashFile;
exports.fileExists = fileExists;
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
function toCanonicalPath(root, relativePath) {
    const normalized = relativePath.replace(/\\/g, '/');
    const resolved = node_path_1.default.resolve(root, normalized);
    const normalizedRoot = node_path_1.default.resolve(root);
    if (!resolved.startsWith(normalizedRoot + node_path_1.default.sep)) {
        throw new Error('Path escapes bundle root');
    }
    const canonical = node_path_1.default.relative(normalizedRoot, resolved);
    return canonical.split(node_path_1.default.sep).join('/');
}
async function hashFile(filePath) {
    const hash = node_crypto_1.default.createHash('sha256');
    await new Promise((resolve, reject) => {
        const stream = node_fs_1.default.createReadStream(filePath);
        stream.on('error', reject);
        stream.on('data', (chunk) => hash.update(chunk));
        stream.on('end', () => resolve());
    });
    return hash.digest('hex');
}
async function fileExists(filePath) {
    try {
        await node_fs_1.default.promises.access(filePath, node_fs_1.default.constants.R_OK);
        return true;
    }
    catch (error) {
        if (error.code === 'ENOENT') {
            return false;
        }
        throw error;
    }
}
