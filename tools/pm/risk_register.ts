import { Octokit } from '@octokit/rest';
const gh = new Octokit({ auth: process.env.GITHUB_TOKEN });
(async () => {
  const [o, r] = process.env.GITHUB_REPOSITORY!.split('/');
  const risks = [
    { id: 'preview-error-deltas', sev: 'M', mit: 'raise budgets or rollback' },
    { id: 'flake-increase', sev: 'H', mit: 'auto-quarantine' },
  ];
  const body = risks
    .map((x) => `- **${x.id}** — Sev ${x.sev} — Mitigation: ${x.mit}`)
    .join('\n');
  await gh.issues.create({
    owner: o,
    repo: r,
    title: `Risk Register ${new Date().toISOString().slice(0, 10)}`,
    body,
    labels: ['risk'],
  });
})();
