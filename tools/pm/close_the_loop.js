"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const rest_1 = require("@octokit/rest");
const fs_1 = __importDefault(require("fs"));
const gh = new rest_1.Octokit({ auth: process.env.GITHUB_TOKEN });
const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
(async () => {
    const risk = JSON.parse(fs_1.default.readFileSync('risk.json', 'utf8'));
    if (risk.bucket === 'high') {
        await gh.issues
            .createLabel({ owner, repo, name: 'needs:arch-review' })
            .catch(() => { });
    }
    // summarize last train run, open a weekly note issue
    await gh.issues.create({
        owner,
        repo,
        title: `Train Report ${new Date().toISOString().slice(0, 10)}`,
        body: `Risk mix: ${risk.bucket}\nMerged via train: see Actions.`,
    });
})();
