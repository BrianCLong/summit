import { Octokit } from '@octokit/rest';
const gh = new Octokit({ auth: process.env.GITHUB_TOKEN });
const REPO = process.env.GITHUB_REPOSITORY!.split('/');
const LABELS = {
  perf: 'area:perf',
  test: 'area:test',
  infra: 'area:infra',
  ui: 'area:ui',
  risk: 'risk:high',
};

function score(issue: any) {
  // heuristic: churn, size, flakiness, p95 regressions
  let s = 0;
  if (/\bperf|latency|p95|slow\b/i.test(issue.title + issue.body)) s += 3;
  if (/\bflake|flaky|intermittent\b/i.test(issue.title + issue.body)) s += 4;
  if (/\bbuild|ci|deploy|helm|keda\b/i.test(issue.title + issue.body)) s += 2;
  if ((issue.labels || []).find((l: any) => l.name === 'customer')) s += 5;
  return s;
}

async function run() {
  const { data: issues } = await gh.rest.issues.listForRepo({
    owner: REPO[0],
    repo: REPO[1],
    state: 'open',
    per_page: 100,
  });
  const ranked = issues
    .map((i) => ({ i, s: score(i) }))
    .sort((a, b) => b.s - a.s);
  const next = ranked.slice(0, 12); // sprint size
  for (const { i } of next) {
    const labels = [];
    if (/\bperf|latency|p95\b/i.test(i.title + i.body))
      labels.push(LABELS.perf);
    if (/\bflake|test\b/i.test(i.title + i.body)) labels.push(LABELS.test);
    if (/\bhelm|keda|deploy|infra\b/i.test(i.title + i.body))
      labels.push(LABELS.infra);
    await gh.rest.issues.addLabels({
      owner: REPO[0],
      repo: REPO[1],
      issue_number: i.number,
      labels,
    });
    // attach task checklist if missing
    if (!/^- [ \]]/m.test(i.body || '')) {
      await gh.rest.issues.update({
        owner: REPO[0],
        repo: REPO[1],
        issue_number: i.number,
        body:
          (i.body || '') +
          '\n\n### Tasks\n- [ ] Design\n- [ ] Code\n- [ ] Tests\n- [ ] Docs\n',
      });
    }
  }
  // create or update milestone "Sprint <YYYY-WW>"
  const ww = new Date();
  const wk = Math.ceil(
    (((ww as any) - new Date(ww.getFullYear(), 0, 1)) / 86400000 +
      new Date(ww.getFullYear(), 0, 1).getDay() +
      1) /
      7,
  );
  const title = `Sprint ${ww.getFullYear()}-${String(wk).padStart(2, '0')}`;
  const { data: milestones } = await gh.rest.issues.listMilestones({
    owner: REPO[0],
    repo: REPO[1],
    state: 'open',
  });
  let ms =
    milestones.find((m) => m.title === title) ||
    (await gh.rest.issues.createMilestone({
      owner: REPO[0],
      repo: REPO[1],
      title,
    }));
  // assign top items to milestone
  for (const { i } of next)
    await gh.rest.issues.update({
      owner: REPO[0],
      repo: REPO[1],
      issue_number: i.number,
      milestone: ms.data?.number || (ms as any).number,
    });
}
run().catch((e) => {
  console.error(e);
  process.exit(1);
});
