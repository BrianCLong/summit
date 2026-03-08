"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findFirstExisting = exports.loadFile = exports.findFiles = exports.readJsonFile = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const fast_glob_1 = __importDefault(require("fast-glob"));
const readJsonFile = (filePath) => {
    try {
        const content = fs_1.default.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
    }
    catch (error) {
        if (error.code === 'ENOENT') {
            return null;
        }
        throw error;
    }
};
exports.readJsonFile = readJsonFile;
const findFiles = (root, patterns) => {
    return fast_glob_1.default.sync(patterns, {
        cwd: root,
        dot: true,
        onlyFiles: true,
        unique: true,
        absolute: true,
    });
};
exports.findFiles = findFiles;
const loadFile = (filePath) => {
    try {
        return fs_1.default.readFileSync(filePath, 'utf8');
    }
    catch (error) {
        if (error.code === 'ENOENT') {
            return null;
        }
        throw error;
    }
};
exports.loadFile = loadFile;
const findFirstExisting = (root, candidates) => {
    for (const candidate of candidates) {
        const fullPath = path_1.default.isAbsolute(candidate) ? candidate : path_1.default.join(root, candidate);
        if (fs_1.default.existsSync(fullPath)) {
            return fullPath;
        }
    }
    return null;
};
exports.findFirstExisting = findFirstExisting;
