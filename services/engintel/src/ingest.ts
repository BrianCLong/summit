import { Octokit } from '@octokit/rest';
import { Pool } from 'pg';
const gh = new Octokit({ auth: process.env.GITHUB_TOKEN });
const pg = new Pool({ connectionString: process.env.DATABASE_URL });
export async function ingest() {
  const prs = await gh.paginate(gh.pulls.list, {
    owner: o(),
    repo: r(),
    state: 'all',
    per_page: 100,
  });
  for (const p of prs) {
    await pg.query(
      `INSERT INTO pr(id,title,author,additions,deletions,merged_at,state) VALUES($1,$2,$3,$4,$5,$6,$7)
                    ON CONFLICT (id) DO UPDATE SET additions=$4, deletions=$5, merged_at=$6, state=$7`,
      [
        p.number,
        p.title,
        p.user?.login,
        p.additions,
        p.deletions,
        p.merged_at,
        p.state,
      ],
    );
  }
  // Repeat for commits, tests (from artifacts), owners (CODEOWNERS), failures, durations
}
function o() {
  return process.env.GH_OWNER!;
}
function r() {
  return process.env.GH_REPO!;
}
