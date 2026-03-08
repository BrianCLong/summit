"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const module_1 = require("module");
const require = (0, module_1.createRequire)(import.meta.url);
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
// Keywords that indicate sensitive data or PII
const KEYWORDS = [
    'email', 'password', 'ssn', 'socialsecurity', 'phone', 'mobile', 'address',
    'dob', 'birth', 'gender', 'ip', 'ipv4', 'ipv6', 'mac', 'deviceid',
    'uuid', 'creditcard', 'cc', 'pan', 'cvv', 'iban', 'bank', 'account',
    'passport', 'license', 'biometric', 'face', 'fingerprint', 'voice',
    'token', 'secret', 'auth', 'credential', 'location', 'gps', 'latitude', 'longitude'
];
// Directories to scan
const SEARCH_DIRS = [
    '../../server/src',
    '../../apps/web/src',
    '../../server/src/db/migrations'
];
const IGNORE_DIRS = [
    'node_modules',
    'dist',
    'build',
    '__tests__',
    '__mocks__'
];
function scanFile(filePath) {
    const matches = [];
    try {
        const content = fs_1.default.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        lines.forEach((line, index) => {
            KEYWORDS.forEach(keyword => {
                // Simple word boundary check
                const regex = new RegExp(`\\b${keyword}\\b`, 'i');
                if (regex.test(line)) {
                    const truncatedLine = line.trim().substring(0, 100);
                    matches.push({
                        file: filePath,
                        line: index + 1,
                        content: truncatedLine,
                        keyword: keyword
                    });
                }
            });
        });
    }
    catch (err) {
        // ignore read errors
    }
    return matches;
}
function walkDir(dir, fileList = []) {
    if (!fs_1.default.existsSync(dir))
        return fileList;
    const files = fs_1.default.readdirSync(dir);
    files.forEach(file => {
        const filePath = path_1.default.join(dir, file);
        const stat = fs_1.default.statSync(filePath);
        if (stat.isDirectory()) {
            if (!IGNORE_DIRS.includes(file)) {
                walkDir(filePath, fileList);
            }
        }
        else {
            if (['.ts', '.js', '.sql', '.prisma', '.graphql'].includes(path_1.default.extname(file))) {
                fileList.push(filePath);
            }
        }
    });
    return fileList;
}
function main() {
    console.log('# Data Inventory Scan Report');
    console.log(`Date: ${new Date().toISOString()}`);
    console.log('');
    const allMatches = [];
    SEARCH_DIRS.forEach(searchDir => {
        const resolvedDir = path_1.default.resolve(__dirname, searchDir);
        const files = walkDir(resolvedDir);
        files.forEach(file => {
            const matches = scanFile(file);
            allMatches.push(...matches);
        });
    });
    // Group by Keyword
    const grouped = {};
    KEYWORDS.forEach(k => grouped[k] = []);
    allMatches.forEach(m => {
        if (grouped[m.keyword])
            grouped[m.keyword].push(m);
    });
    console.log('## Summary');
    console.log('| Keyword | Count |');
    console.log('| :--- | :--- |');
    Object.keys(grouped).forEach(k => {
        if (grouped[k].length > 0) {
            console.log(`| ${k} | ${grouped[k].length} |`);
        }
    });
    console.log('');
    console.log('## Detailed Matches (Top 5 per keyword)');
    Object.keys(grouped).forEach(k => {
        if (grouped[k].length > 0) {
            console.log(`\n### ${k}`);
            grouped[k].slice(0, 5).forEach(m => {
                const relPath = path_1.default.relative(path_1.default.resolve(__dirname, '../..'), m.file);
                console.log(`- **${relPath}:${m.line}**: \`${m.content}\``);
            });
        }
    });
}
main();
