"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const rest_1 = require("@octokit/rest");
const gh = new rest_1.Octokit({ auth: process.env.GITHUB_TOKEN });
const REPO = process.env.GITHUB_REPOSITORY.split('/');
const report = JSON.parse(fs_1.default.readFileSync('jest-report.json', 'utf8'));
const flaky = report.testResults.filter((t) => t.status === 'failed' &&
    /Timeout|flaky|intermittent/i.test(JSON.stringify(t)));
for (const f of flaky) {
    await gh.rest.issues.create({
        owner: REPO[0],
        repo: REPO[1],
        title: `Flaky: ${f.name}`,
        body: 'Auto-detected flake\n\n```json\n' + JSON.stringify(f, null, 2) + '\n```',
        labels: ['area:test', 'flake'],
    });
}
