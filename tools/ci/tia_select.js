"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const base = process.env.GITHUB_BASE_REF || 'origin/main';
const changed = (0, child_process_1.execSync)(`git diff --name-only ${base}...HEAD`)
    .toString()
    .trim()
    .split('\n')
    .filter(Boolean);
function findTestsTouching(files) {
    // heuristic: co-located tests + same feature dirs + simple import graph
    const tests = new Set();
    for (const f of files) {
        const dir = path_1.default.dirname(f);
        for (const ext of ['.test.ts', '.spec.ts', '.test.tsx', '.spec.tsx']) {
            const guess = path_1.default.join(dir, path_1.default.basename(f).replace(/\.tsx?$/, ext));
            if (fs_1.default.existsSync(guess))
                tests.add(guess);
        }
    }
    // fallback: run tests under any top-level feature touched
    for (const f of files) {
        const top = f.split(path_1.default.sep)[0];
        for (const ext of ['.test.ts', '.spec.ts', '.test.tsx', '.spec.tsx']) {
            for (const g of glob(`{server,services,client,apps}/**/*${ext}`))
                if (g.startsWith(top))
                    tests.add(g);
        }
    }
    return [...tests];
}
// tiny glob without deps
function glob(pattern) {
    try {
        return (0, child_process_1.execSync)(`ls -1 ${pattern}`, { shell: 'bash' })
            .toString()
            .trim()
            .split('\n')
            .filter(Boolean);
    }
    catch {
        return [];
    }
}
const out = findTestsTouching(changed);
fs_1.default.writeFileSync('tia-tests.txt', out.join('\n'));
console.log(`::notice ::TIA selected ${out.length} tests`);
