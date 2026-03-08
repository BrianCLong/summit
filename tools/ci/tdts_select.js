"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const changed = fs_1.default
    .readFileSync('changed.txt', 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean);
const map = JSON.parse(fs_1.default.readFileSync('tdts-map.json', 'utf8'));
const run = new Set();
for (const m of map) {
    if (m.files.some((f) => changed.some((c) => f.startsWith(c.split('/')[0])))) {
        run.add(m.test);
    }
}
fs_1.default.writeFileSync('tdts-tests.txt', [...run].join('\n'));
console.log(`TDTS selected ${run.size} tests`);
