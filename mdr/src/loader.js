"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadSpecFromFile = loadSpecFromFile;
exports.discoverSpecFiles = discoverSpecFiles;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const yaml_1 = require("yaml");
const utils_1 = require("./utils");
function loadSpecFromFile(filePath) {
    const content = fs_1.default.readFileSync(filePath, 'utf8');
    const parsed = (0, yaml_1.parse)(content);
    if (!parsed || typeof parsed !== 'object') {
        throw new Error(`Invalid spec structure in ${filePath}`);
    }
    validateSpec(parsed, filePath);
    const signature = (0, utils_1.createSpecSignature)(parsed);
    return { spec: parsed, absolutePath: filePath, signature };
}
function discoverSpecFiles(specRoot) {
    const results = [];
    const walk = (dir) => {
        const entries = fs_1.default.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const abs = path_1.default.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(abs);
            }
            else if (entry.isFile() && entry.name.endsWith('.yaml')) {
                results.push(abs);
            }
        }
    };
    walk(specRoot);
    return results.sort();
}
function validateSpec(spec, filePath) {
    if (!spec.name) {
        throw new Error(`Spec ${filePath} is missing required field 'name'.`);
    }
    if (typeof spec.version !== 'number') {
        throw new Error(`Spec ${spec.name} is missing numeric 'version'.`);
    }
    if (!Array.isArray(spec.grain) || spec.grain.length === 0) {
        throw new Error(`Spec ${spec.name} must define at least one grain column.`);
    }
    if (!spec.source) {
        throw new Error(`Spec ${spec.name} must define a source table or view.`);
    }
    if (!Array.isArray(spec.measures) || spec.measures.length === 0) {
        throw new Error(`Spec ${spec.name} must define at least one measure.`);
    }
    if (!Array.isArray(spec.owners) || spec.owners.length === 0) {
        throw new Error(`Spec ${spec.name} must define at least one owner.`);
    }
}
