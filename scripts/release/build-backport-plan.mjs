#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import https from 'https';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Polyfill for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Argument parsing
const args = process.argv.slice(2);
const params = {
  series: null,
  repo: process.env.GITHUB_REPOSITORY,
  out: 'dist/release/backport-plan.md',
  since: null,
};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--series') params.series = args[++i];
  else if (args[i] === '--repo') params.repo = args[++i];
  else if (args[i] === '--out') params.out = args[++i];
  else if (args[i] === '--since') params.since = args[++i];
}

if (!params.series) {
  console.error('Error: --series <X.Y> is required');
  process.exit(1);
}

if (!params.repo) {
    // Try to guess repo from git config
    try {
        const remoteOrigin = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
        const match = remoteOrigin.match(/github\.com[:/]([^/]+\/[^.]+)(\.git)?$/);
        if (match) {
            params.repo = match[1];
        }
    } catch (e) {
        // ignore
    }
}

if (!params.repo) {
  console.error('Error: --repo <owner/name> is required or must be set via GITHUB_REPOSITORY or detected via git remote');
  process.exit(1);
}

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

async function fetchGitHub(path) {
  if (token) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.github.com',
        path: path,
        method: 'GET',
        headers: {
          'User-Agent': 'Backport-Planner',
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(data));
          } else {
            reject(new Error(`GitHub API Error: ${res.statusCode} ${data}`));
          }
        });
      });

      req.on('error', (e) => reject(e));
      req.end();
    });
  } else {
    // Fallback to gh CLI
    try {
      // gh api expects the path without leading slash sometimes, but mostly handles it.
      // We will ensure consistent behavior.
      const cmd = `gh api "${path}"`;
      const output = execSync(cmd, { encoding: 'utf8' });
      return JSON.parse(output);
    } catch (e) {
      throw new Error(`Failed to fetch from GitHub via gh CLI. Ensure gh is installed and authenticated, or set GITHUB_TOKEN. Error: ${e.message}`);
    }
  }
}

async function getSinceDate(tag, repo) {
    // Get tag ref
    // GET /repos/{owner}/{repo}/git/ref/tags/{tag}
    try {
        const refData = await fetchGitHub(`/repos/${repo}/git/ref/tags/${tag}`);
        const sha = refData.object.sha;
        const type = refData.object.type;
        let commitSha = sha;

        if (type === 'tag') {
             const tagData = await fetchGitHub(`/repos/${repo}/git/tags/${sha}`);
             commitSha = tagData.object.sha;
        }

        const commitData = await fetchGitHub(`/repos/${repo}/git/commits/${commitSha}`);
        return commitData.author.date;
    } catch (e) {
        console.error(`Error resolving tag ${tag}:`, e.message);
        process.exit(1);
    }
}

async function main() {
  console.log(`Generating backport plan for series ${params.series} in ${params.repo}...`);

  let sinceQuery = '';
  if (params.since) {
    const date = await getSinceDate(params.since, params.repo);
    // date format from git API is usually ISO 8601
    // search API expects YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSZ
    sinceQuery = ` merged:>=${date}`;
    console.log(`Filtering PRs merged after ${params.since} (${date})`);
  }

  const query = `repo:${params.repo} is:pr is:merged label:"backport/needed" label:"backport/release-${params.series}"${sinceQuery}`;
  const searchPath = `/search/issues?q=${encodeURIComponent(query)}&sort=created&order=asc&per_page=100`;

  let items = [];
  try {
      const searchResult = await fetchGitHub(searchPath);
      items = searchResult.items;
  } catch (e) {
      console.error("Failed to search PRs:", e.message);
      process.exit(1);
  }

  if (!items || items.length === 0) {
      console.log("No backport PRs found.");
      process.exit(0);
  }

  console.log(`Found ${items.length} PRs. Fetching details...`);

  const prDetails = [];
  for (const item of items) {
      const prNumber = item.number;
      try {
          const pr = await fetchGitHub(`/repos/${params.repo}/pulls/${prNumber}`);
          prDetails.push({
              number: pr.number,
              title: pr.title,
              url: pr.html_url,
              merge_commit_sha: pr.merge_commit_sha,
              merged_at: pr.merged_at,
              author: pr.user.login,
              labels: pr.labels.map(l => l.name)
          });
      } catch (e) {
          console.error(`Failed to fetch PR #${prNumber}:`, e.message);
      }
  }

  // Sort by merged_at
  prDetails.sort((a, b) => new Date(a.merged_at) - new Date(b.merged_at));

  // Generate Markdown
  const branchName = `release/${params.series}`;
  const now = new Date().toISOString();

  let md = `# Backport Plan: ${params.series}\n\n`;
  md += `**Generated At:** ${now}\n`;
  md += `**Repo:** ${params.repo}\n`;
  md += `**Source PR Count:** ${prDetails.length}\n\n`;

  md += `| PR | Title | Merge SHA | Merged At | Notes |\n`;
  md += `| -- | ----- | --------- | --------- | ----- |\n`;

  for (const pr of prDetails) {
      const shortSha = pr.merge_commit_sha ? pr.merge_commit_sha.substring(0, 7) : 'N/A';
      md += `| [#${pr.number}](${pr.url}) | ${pr.title.replace(/\|/g, '\\|')} | \`${shortSha}\` | ${pr.merged_at} | |\n`;
  }

  md += `\n## Cherry-pick commands\n\n`;
  md += `\`\`\`bash\n`;
  md += `git checkout ${branchName}\n`;

  const shas = prDetails
      .map(pr => pr.merge_commit_sha)
      .filter(sha => sha) // filter out null/undefined
      .join(' ');

  if (shas) {
      md += `git cherry-pick ${shas}\n`;
  } else {
      md += `# No SHAs found to cherry-pick\n`;
  }

  md += `\`\`\`\n`;

  md += `\n## Ready to tag\n\n`;
  md += `- [ ] Run \`pnpm release:bundle -- --tag v${params.series}.Z --dry-run\`\n`;
  md += `- [ ] Confirm preflight accepts series branch\n`;
  md += `- [ ] Tag + Push\n`;

  // Output
  const outDir = path.dirname(params.out);
  if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(params.out, md);
  console.log(`Wrote markdown plan to ${params.out}`);

  const parsed = path.parse(params.out);
  const jsonOut = path.join(parsed.dir, parsed.name + '.json');
  fs.writeFileSync(jsonOut, JSON.stringify(prDetails, null, 2));
  console.log(`Wrote JSON plan to ${jsonOut}`);

}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
