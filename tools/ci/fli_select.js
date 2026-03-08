"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const changed = JSON.parse(fs_1.default.readFileSync('changed_ast.json', 'utf8')); // {file:[func1, func2]}
const map = JSON.parse(fs_1.default.readFileSync('fli-map.json', 'utf8'));
const run = new Set();
for (const m of map) {
    for (const [f, ff] of Object.entries(changed))
        if (m.files.includes(f) &&
            m.funcs.some((x) => ff.includes(x)))
            run.add(m.test);
}
fs_1.default.writeFileSync('fli-tests.txt', [...run].join('\n'));
console.log(`FLI selected ${run.size} tests`);
