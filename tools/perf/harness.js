"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const autocannon_1 = __importDefault(require("autocannon"));
const fs_1 = require("fs");
async function run() {
    const r = await (0, autocannon_1.default)({
        url: process.env.URL || 'http://localhost:4000/health',
        duration: 10,
    });
    (0, fs_1.writeFileSync)('perf.json', JSON.stringify({ p95: r.latency.p95, rps: r.requests.average }));
}
run();
