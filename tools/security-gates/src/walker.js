"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findFilesByGlob = findFilesByGlob;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
async function findFilesByGlob(rootDir, globs) {
    const files = [];
    for (const pattern of globs) {
        if (pattern.startsWith('**')) {
            const trimmed = pattern.replace('**', '').replace('/*', '').replace('*', '');
            files.push(...walkForExtension(rootDir, trimmed));
        }
        else {
            const candidate = node_path_1.default.resolve(rootDir, pattern);
            if (node_fs_1.default.existsSync(candidate) && node_fs_1.default.statSync(candidate).isFile()) {
                files.push(candidate);
            }
        }
    }
    return Array.from(new Set(files));
}
function walkForExtension(rootDir, extension) {
    const results = [];
    const stack = [rootDir];
    while (stack.length) {
        const current = stack.pop();
        if (!current)
            continue;
        const entries = node_fs_1.default.readdirSync(current, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.name === 'node_modules' || entry.name.startsWith('.git'))
                continue;
            const fullPath = node_path_1.default.join(current, entry.name);
            if (entry.isDirectory()) {
                stack.push(fullPath);
            }
            else if (entry.isFile()) {
                if (entry.name.endsWith(extension) || extension === '') {
                    results.push(fullPath);
                }
            }
        }
    }
    return results;
}
