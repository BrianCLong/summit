"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ts_morph_1 = require("ts-morph");
const fs_1 = __importDefault(require("fs"));
const cov = JSON.parse(fs_1.default.readFileSync('coverage/coverage-final.json', 'utf8')); // jest --coverage
const map = [];
for (const [file, data] of Object.entries(cov)) {
    const p = new ts_morph_1.Project({ useInMemoryFileSystem: false });
    const sf = p.addSourceFileAtPath(file);
    const funcs = sf
        .getFunctions()
        .map((f) => f.getName())
        .filter(Boolean);
    const tests = data.tests?.map((t) => t.title) || [];
    tests.forEach((t) => map.push({ test: t, files: [file], funcs }));
}
fs_1.default.writeFileSync('fli-map.json', JSON.stringify(map, null, 2));
