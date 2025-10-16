import { Octokit } from '@octokit/rest';
import fs from 'fs';

const gh = new Octokit({ auth: process.env.GITHUB_TOKEN });
const [o, r] = process.env.GITHUB_REPOSITORY!.split('/');

(async () => {
  const prs = (
    await gh.pulls.list({ owner: o, repo: r, state: 'open', per_page: 100 })
  ).data;
  const rows = prs.map((p) => ({
    n: p.number,
    size: p.additions + p.deletions,
    risky: +(p.labels || []).some((l: any) => l.name === 'risk:high'),
  }));
  let md = '### Delivery Risk Heatmap\n\n|PR|Δ|Risk|\n|--:|--:|:--:|\n';
  for (const x of rows) md += `|#${x.n}|${x.size}|${x.risky ? '🔥' : '-'}|\n`;
  fs.writeFileSync('heatmap.md', md);
})();
