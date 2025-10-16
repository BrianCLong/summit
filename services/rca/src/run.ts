import fs from 'fs';
import { Octokit } from '@octokit/rest';
import { cluster } from './cluster';
const gh = new Octokit({ auth: process.env.GITHUB_TOKEN });
const [o, r] = (process.env.GITHUB_REPOSITORY as string).split('/');
const rep = JSON.parse(fs.readFileSync('jest-report.json', 'utf8'));
const msgs = rep.testResults
  .filter((t: any) => t.status === 'failed')
  .map((t: any) => t.message || t.name);
const A = cluster(msgs, Math.min(6, Math.max(1, Math.floor(msgs.length / 3))));
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
