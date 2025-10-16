import fs from 'fs';
import { Octokit } from '@octokit/rest';
const gh = new Octokit({ auth: process.env.GITHUB_TOKEN });
const REPO = process.env.GITHUB_REPOSITORY!.split('/');
const report = JSON.parse(fs.readFileSync('jest-report.json', 'utf8'));
const flaky = report.testResults.filter(
  (t: any) =>
    t.status === 'failed' &&
    /Timeout|flaky|intermittent/i.test(JSON.stringify(t)),
);
for (const f of flaky) {
  await gh.rest.issues.create({
    owner: REPO[0],
    repo: REPO[1],
    title: `Flaky: ${f.name}`,
    body:
      'Auto-detected flake\n\n```json\n' + JSON.stringify(f, null, 2) + '\n```',
    labels: ['area:test', 'flake'],
  });
}
