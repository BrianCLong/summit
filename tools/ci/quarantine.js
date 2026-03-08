"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const report = JSON.parse(fs_1.default.readFileSync('jest-report.json', 'utf8'));
const flakes = report.testResults.filter((t) => t.status === 'failed' &&
    /Timeout|flaky|intermittent|retry/i.test(JSON.stringify(t)));
if (!flakes.length)
    process.exit(0);
const path = 'tests/.quarantine.json';
let q = [];
try {
    q = JSON.parse(fs_1.default.readFileSync(path, 'utf8'));
}
catch { }
const names = new Set(q.concat(flakes.map((t) => t.name)));
fs_1.default.writeFileSync(path, JSON.stringify([...names].sort(), null, 2));
console.log(`::warning ::quarantined ${flakes.length} tests`);
