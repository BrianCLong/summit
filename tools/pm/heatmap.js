"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const rest_1 = require("@octokit/rest");
const fs_1 = __importDefault(require("fs"));
const gh = new rest_1.Octokit({ auth: process.env.GITHUB_TOKEN });
const [o, r] = process.env.GITHUB_REPOSITORY.split('/');
(async () => {
    const prs = (await gh.pulls.list({ owner: o, repo: r, state: 'open', per_page: 100 })).data;
    const rows = prs.map((p) => ({
        n: p.number,
        size: p.additions + p.deletions,
        risky: +(p.labels || []).some((l) => l.name === 'risk:high'),
    }));
    let md = '### Delivery Risk Heatmap\n\n|PR|Δ|Risk|\n|--:|--:|:--:|\n';
    for (const x of rows)
        md += `|#${x.n}|${x.size}|${x.risky ? '🔥' : '-'}|\n`;
    fs_1.default.writeFileSync('heatmap.md', md);
})();
