"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const bp = js_yaml_1.default.load(fs_1.default.readFileSync(process.argv[2], 'utf8'));
const name = process.argv[3];
function exists(p) {
    try {
        fs_1.default.accessSync(p.replace(/\$\{name\}/g, name));
        return true;
    }
    catch {
        return false;
    }
}
function grep(p, s) {
    try {
        return fs_1.default.readFileSync(p.replace(/\$\{name\}/g, name), 'utf8').includes(s);
    }
    catch {
        return false;
    }
}
function pkgHas(k) {
    try {
        const j = JSON.parse(fs_1.default.readFileSync('package.json', 'utf8'));
        return k.split('.').reduce((a, c) => a?.[c], j) !== undefined;
    }
    catch {
        return false;
    }
}
function workflowHas(job) {
    try {
        return fs_1.default.readFileSync('.github/workflows/ci.yml', 'utf8').includes(job);
    }
    catch {
        return false;
    }
}
let score = 0;
for (const r of bp.scorecard.rules) {
    const q = r.query;
    const ok = q.startsWith('exists(')
        ? exists(q.slice(8, -2))
        : q.startsWith('grep(')
            ? (() => {
                const [p, s] = q.slice(5, -2).split("','");
                return grep(p.replace(/'/g, ''), s);
            })()
            : q.startsWith('packageJsonHas(')
                ? pkgHas(q.slice(16, -2).replace(/'/g, ''))
                : q.startsWith('workflowHasJob(')
                    ? workflowHas(q.slice(16, -2).replace(/'/g, ''))
                    : false;
    if (ok)
        score += r.weight;
}
console.log(JSON.stringify({ score }));
if (score < bp.threshold)
    process.exit(1);
