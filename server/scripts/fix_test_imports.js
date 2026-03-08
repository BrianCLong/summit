"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
const projectRoot = path_1.default.resolve(__dirname, '../'); // server/
const jestGlobals = [
    'jest',
    'describe',
    'it',
    'test',
    'expect',
    'beforeAll',
    'afterAll',
    'beforeEach',
    'afterEach',
];
async function fixImports() {
    const files = [];
    function walk(dir) {
        const list = fs_1.default.readdirSync(dir);
        list.forEach(file => {
            const filePath = path_1.default.join(dir, file);
            try {
                const stat = fs_1.default.statSync(filePath);
                if (stat.isDirectory()) {
                    if (file !== 'node_modules' && file !== 'dist' && file !== 'coverage') {
                        walk(filePath);
                    }
                }
                else {
                    if (file.endsWith('.test.ts')) {
                        files.push(filePath);
                    }
                }
            }
            catch (e) {
                // ignore
            }
        });
    }
    walk(projectRoot);
    console.log(`Found ${files.length} test files.`);
    let fixedCount = 0;
    const limit = 40;
    for (const file of files) {
        if (fixedCount >= limit)
            break;
        let content = fs_1.default.readFileSync(file, 'utf-8');
        const usedGlobals = jestGlobals.filter(g => {
            const regex = new RegExp(`\\b${g}\\b`);
            return regex.test(content);
        });
        if (usedGlobals.length === 0)
            continue;
        if (content.includes("from '@jest/globals'")) {
            continue;
        }
        const importStatement = `import { ${usedGlobals.join(', ')} } from '@jest/globals';`;
        const lines = content.split('\n');
        let lastImportLine = -1;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim().startsWith('import ')) {
                lastImportLine = i;
            }
        }
        if (lastImportLine !== -1) {
            lines.splice(lastImportLine + 1, 0, importStatement);
        }
        else {
            lines.unshift(importStatement);
        }
        content = lines.join('\n');
        fs_1.default.writeFileSync(file, content, 'utf-8');
        fixedCount++;
        console.log(`Fixed ${path_1.default.relative(projectRoot, file)}`);
    }
    console.log(`Fixed ${fixedCount} files.`);
}
fixImports().catch(console.error);
