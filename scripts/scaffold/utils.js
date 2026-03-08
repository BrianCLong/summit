"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROJECT_ROOT = exports.TEMPLATES_DIR = void 0;
exports.readFile = readFile;
exports.writeFile = writeFile;
exports.toPascalCase = toPascalCase;
exports.toKebabCase = toKebabCase;
exports.toCamelCase = toCamelCase;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
const __filename = (0, node_url_1.fileURLToPath)(import.meta.url);
const __dirname = node_path_1.default.dirname(__filename);
async function readFile(filepath) {
    try {
        return await promises_1.default.readFile(filepath, 'utf-8');
    }
    catch (error) {
        console.error(`Error reading file ${filepath}:`, error);
        throw error;
    }
}
async function writeFile(filepath, content) {
    try {
        // Check if file exists
        try {
            await promises_1.default.access(filepath);
            console.error(`❌ File already exists: ${filepath}`);
            console.error('   Aborting to prevent overwrite.');
            throw new Error(`File already exists: ${filepath}`);
        }
        catch (error) {
            if (error.code !== 'ENOENT' && !error.message.includes('File already exists')) {
                throw error;
            }
        }
        const dir = node_path_1.default.dirname(filepath);
        await promises_1.default.mkdir(dir, { recursive: true });
        await promises_1.default.writeFile(filepath, content, 'utf-8');
        console.log(`Created: ${filepath}`);
    }
    catch (error) {
        console.error(`Error writing file ${filepath}:`, error);
        throw error;
    }
}
function toPascalCase(str) {
    return str
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase())
        .replace(/\s+/g, '')
        .replace(/-/g, '');
}
function toKebabCase(str) {
    return str
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/[\s_]+/g, '-')
        .toLowerCase();
}
function toCamelCase(str) {
    return str
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => index === 0 ? word.toLowerCase() : word.toUpperCase())
        .replace(/\s+/g, '')
        .replace(/-/g, '');
}
exports.TEMPLATES_DIR = node_path_1.default.join(__dirname, 'templates');
exports.PROJECT_ROOT = node_path_1.default.resolve(__dirname, '../../');
