"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.captureGolden = captureGolden;
exports.compareToGolden = compareToGolden;
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
async function captureGolden(runId, artifacts, dir = 'goldens') {
    await fs_1.promises.mkdir(dir, { recursive: true });
    const file = path_1.default.join(dir, `${runId}.json`);
    const payload = JSON.stringify(artifacts, Object.keys(artifacts).sort());
    const sha = crypto_1.default.createHash('sha256').update(payload).digest('hex');
    await fs_1.promises.writeFile(file, JSON.stringify({ sha, artifacts }, null, 2));
    return { file, sha };
}
async function compareToGolden(runId, actual, dir = 'goldens', tolerances) {
    const file = path_1.default.join(dir, `${runId}.json`);
    const baseline = JSON.parse(await fs_1.promises.readFile(file, 'utf8'));
    const diffs = [];
    function cmp(a, b, p = '') {
        if (typeof a === 'number' && typeof b === 'number') {
            const key = p.split('.').pop() || '';
            const tol = (tolerances && tolerances[key]) || 0;
            if (Math.abs(a - b) > tol)
                diffs.push(`${p}: ${a} vs ${b} (> tol ${tol})`);
            return;
        }
        if (Array.isArray(a) && Array.isArray(b)) {
            if (a.length !== b.length)
                diffs.push(`${p}: len ${a.length} vs ${b.length}`);
            a.forEach((v, i) => cmp(v, b[i], `${p}[${i}]`));
            return;
        }
        if (a && b && typeof a === 'object' && typeof b === 'object') {
            const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
            for (const k of keys)
                cmp(a[k], b[k], p ? `${p}.${k}` : k);
            return;
        }
        if (a !== b)
            diffs.push(`${p}: ${a} vs ${b}`);
    }
    cmp(actual, baseline.artifacts, '');
    return { ok: diffs.length === 0, diffs };
}
