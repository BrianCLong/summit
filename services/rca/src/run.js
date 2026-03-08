"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const rest_1 = require("@octokit/rest");
const cluster_1 = require("./cluster");
const gh = new rest_1.Octokit({ auth: process.env.GITHUB_TOKEN });
const [o, r] = process.env.GITHUB_REPOSITORY.split('/');
const rep = JSON.parse(fs_1.default.readFileSync('jest-report.json', 'utf8'));
const msgs = rep.testResults
    .filter((t) => t.status === 'failed')
    .map((t) => t.message || t.name);
const A = (0, cluster_1.cluster)(msgs, Math.min(6, Math.max(1, Math.floor(msgs.length / 3))));
for (const g of new Set(A)) {
    const set = msgs.filter((_, i) => A[i] === g);
    const title = `RCA: ${set[0].slice(0, 80)}`;
    await gh.issues.create({
        owner: o,
        repo: r,
        title,
        body: '```\n' + set.slice(0, 5).join('\n---\n') + '\n```',
        labels: ['rca', 'flake'],
    });
}
