"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.canonicalizeSpec = canonicalizeSpec;
exports.createSpecSignature = createSpecSignature;
exports.ensureDir = ensureDir;
exports.writeFileIfChanged = writeFileIfChanged;
exports.quoteIdentifier = quoteIdentifier;
exports.formatFilterValue = formatFilterValue;
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function canonicalizeSpec(spec) {
    return JSON.stringify(sortObject(spec), null, 2);
}
function sortObject(value) {
    if (Array.isArray(value)) {
        return value.map(sortObject);
    }
    if (value && typeof value === 'object') {
        const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
        return entries.reduce((acc, [key, val]) => {
            acc[key] = sortObject(val);
            return acc;
        }, {});
    }
    return value;
}
function createSpecSignature(spec) {
    const canonical = canonicalizeSpec(spec);
    return crypto_1.default.createHash('sha256').update(canonical).digest('hex');
}
function ensureDir(dirPath) {
    if (!fs_1.default.existsSync(dirPath)) {
        fs_1.default.mkdirSync(dirPath, { recursive: true });
    }
}
function writeFileIfChanged(filePath, content) {
    const normalized = `${content.trimEnd()}\n`;
    if (fs_1.default.existsSync(filePath)) {
        const existing = fs_1.default.readFileSync(filePath, 'utf8');
        if (existing === normalized) {
            return false;
        }
    }
    ensureDir(path_1.default.dirname(filePath));
    fs_1.default.writeFileSync(filePath, normalized, 'utf8');
    return true;
}
function quoteIdentifier(dialect, identifier) {
    switch (dialect) {
        case 'bigquery':
            return `\`${identifier}\``;
        case 'snowflake':
            return `"${identifier.toUpperCase()}"`;
        case 'postgres':
        default:
            return `"${identifier}"`;
    }
}
function formatFilterValue(value) {
    if (Array.isArray(value)) {
        return `(${value.map(formatScalar).join(', ')})`;
    }
    return formatScalar(value);
}
function formatScalar(value) {
    if (typeof value === 'number') {
        return value.toString();
    }
    if (typeof value === 'boolean') {
        return value ? 'TRUE' : 'FALSE';
    }
    return `'${value.replace(/'/g, "''")}'`;
}
