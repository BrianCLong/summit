import { Octokit } from '@octokit/rest';
import fs from 'fs';

const gh = new Octokit({ auth: process.env.GITHUB_TOKEN });
const [owner, repo] = process.env.GITHUB_REPOSITORY!.split('/');

(async () => {
  const risk = JSON.parse(fs.readFileSync('risk.json', 'utf8'));
  if (risk.bucket === 'high') {
    await gh.issues
      .createLabel({ owner, repo, name: 'needs:arch-review' })
      .catch(() => {});
  }
  // summarize last train run, open a weekly note issue
  await gh.issues.create({
    owner,
    repo,
    title: `Train Report ${new Date().toISOString().slice(0, 10)}`,
    body: `Risk mix: ${risk.bucket}\nMerged via train: see Actions.`,
  });
})();
