"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const base = JSON.parse(fs_1.default.readFileSync('perf-baseline.json', 'utf8'));
const cur = JSON.parse(fs_1.default.readFileSync('perf.json', 'utf8'));
if (cur.p95 > base.p95 * 1.05) {
    console.error('p95 regression');
    process.exit(1);
}
