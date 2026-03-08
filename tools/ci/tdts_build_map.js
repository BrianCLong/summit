"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const spans = JSON.parse(fs_1.default.readFileSync('otel-spans.json', 'utf8')); // exported from CI run
const map = new Map(); // testName -> files
for (const s of spans) {
    const test = s.attributes['test.name'];
    const file = s.attributes['code.filepath'];
    if (!test || !file)
        continue;
    if (!map.has(test))
        map.set(test, new Set());
    map.get(test).add(file);
}
fs_1.default.writeFileSync('tdts-map.json', JSON.stringify([...map].map(([k, v]) => ({ test: k, files: [...v] }))));
