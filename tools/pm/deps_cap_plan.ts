import { Octokit } from '@octokit/rest';
import fs from 'fs';
const gh = new Octokit({ auth: process.env.GITHUB_TOKEN });
const [o, r] = process.env.GITHUB_REPOSITORY!.split('/');
(async () => {
  const issues = (
    await gh.issues.listForRepo({
      owner: o,
      repo: r,
      state: 'open',
      per_page: 200,
    })
  ).data.filter((i) => !i.pull_request);
  // Parse “Depends: #123,#456” hints
  const deps = issues.map((i) => ({
    num: i.number,
    deps: (i.body || '').match(/#\d+/g)?.map((s) => Number(s.slice(1))) || [],
  }));
  fs.writeFileSync('deps.json', JSON.stringify(deps, null, 2));
})();
