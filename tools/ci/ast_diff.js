"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ts_morph_1 = require("ts-morph");
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const base = process.env.GITHUB_BASE_REF || 'origin/main';
const files = (0, child_process_1.execSync)(`git diff --name-only ${base}...HEAD -- '*.ts' '*.tsx'`)
    .toString()
    .trim()
    .split('\n')
    .filter(Boolean);
const pOld = new ts_morph_1.Project(), pNew = new ts_morph_1.Project();
const out = {};
for (const f of files) {
    try {
        const old = (0, child_process_1.execSync)(`git show ${base}:${f}`, { stdio: 'pipe' }).toString();
        const neu = (0, child_process_1.execSync)(`cat ${f}`, { stdio: 'pipe' }).toString();
        const sOld = pOld.createSourceFile('old/' + f, old, { overwrite: true });
        const sNew = pNew.createSourceFile('new/' + f, neu, { overwrite: true });
        const funcsNew = new Set(sNew
            .getFunctions()
            .map((fn) => fn.getName())
            .filter(Boolean));
        const funcsOld = new Set(sOld
            .getFunctions()
            .map((fn) => fn.getName())
            .filter(Boolean));
        const changed = [...new Set([...funcsNew, ...funcsOld])].filter((n) => JSON.stringify(sOld.getFunction(n)?.getText() || '') !==
            JSON.stringify(sNew.getFunction(n)?.getText() || ''));
        if (changed.length)
            out[f] = changed;
    }
    catch { }
}
fs_1.default.writeFileSync('changed_ast.json', JSON.stringify(out, null, 2));
