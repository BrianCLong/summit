const { Octokit } = require('@octokit/rest');
const gh = new Octokit({ auth: process.env.GITHUB_TOKEN });
(async () => {
  const [o, r] = process.env.GITHUB_REPOSITORY.split('/');
  const pr = (
    await gh.pulls.get({
      owner: o,
      repo: r,
      pull_number:
        process.env.PR_NUMBER || process.env.GITHUB_REF?.split('/').pop(),
    })
  ).data;
  const chunks = [
    { area: 'server', estHrs: 2 },
    { area: 'charts', estHrs: 1 },
  ];
  const devs = [
    { user: 'alice', areas: ['server'], p95ReviewHrs: 6, defectRate: 0.02 },
    {
      user: 'bob',
      areas: ['charts', 'server'],
      p95ReviewHrs: 8,
      defectRate: 0.03,
    },
  ];
  const reviewers = chunks
    .map((c) =>
      require('../../services/engintel/dist/fit').bestReviewer(c, devs),
    )
    .filter(Boolean);
  await gh.pulls.requestReviewers({
    owner: o,
    repo: r,
    pull_number: pr.number,
    reviewers: [...new Set(reviewers)],
  });
})();
