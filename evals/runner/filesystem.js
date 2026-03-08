"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listFiles = exports.sha256File = exports.readJson = exports.writeJson = exports.ensureDir = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const ensureDir = async (dir) => {
    await promises_1.default.mkdir(dir, { recursive: true });
};
exports.ensureDir = ensureDir;
const writeJson = async (filePath, data) => {
    await promises_1.default.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
};
exports.writeJson = writeJson;
const readJson = async (filePath) => {
    const raw = await promises_1.default.readFile(filePath, 'utf8');
    return JSON.parse(raw);
};
exports.readJson = readJson;
const sha256File = async (filePath) => {
    const content = await promises_1.default.readFile(filePath);
    const hash = node_crypto_1.default.createHash('sha256');
    hash.update(content);
    return hash.digest('hex');
};
exports.sha256File = sha256File;
const listFiles = async (dir) => {
    const entries = await promises_1.default.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(entries.map(async (entry) => {
        const fullPath = node_path_1.default.join(dir, entry.name);
        if (entry.isDirectory()) {
            return (0, exports.listFiles)(fullPath);
        }
        return [fullPath];
    }));
    return files.flat();
};
exports.listFiles = listFiles;
