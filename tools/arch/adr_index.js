"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const adrs = fs_1.default.readdirSync('docs/adr').filter((f) => f.endsWith('.md'));
const rules = adrs.flatMap((f) => {
    const s = fs_1.default.readFileSync(`docs/adr/${f}`, 'utf8');
    const lines = [...s.matchAll(/<!-- guard:\s*(.+?)\s*-->/g)].map((m) => m[1]);
    return lines.map((l) => ({ id: f, rego: l }));
});
fs_1.default.writeFileSync('.maestro/adr_rules.json', JSON.stringify(rules, null, 2));
