"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const cfg = JSON.parse(fs_1.default.readFileSync('.maestro/ci_budget.json', 'utf8'));
const monthSpend = Number(process.env.COST_MONTH_USD || '0'); // from exporter
const phase = process.env.PHASE || 'pull_request';
const headroom = cfg.monthlyUsd * cfg.hardPct - monthSpend;
let concurrency = phase === 'main' ? 8 : 4;
if (monthSpend > cfg.monthlyUsd * cfg.softPct)
    concurrency = Math.max(2, Math.round(concurrency * 0.5));
if (headroom < 100)
    concurrency = 1;
console.log(JSON.stringify({ concurrency }));
