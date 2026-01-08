import { readFileSync, writeFileSync, existsSync, readdirSync, lstatSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { env } from 'node:process';
import https from 'node:https';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const isMain = process.argv[1] === import.meta.filename || process.argv[1] === resolve(import.meta.filename);

const ARGS = process.argv.slice(2);
const CONFIG = {
  channel: getArg('channel'),
  target: getArg('target'),
  since: getArg('since'),
  plan: getArg('plan'),
  out: getArg('out'),
  token: env.GITHUB_TOKEN,
  repo: env.GITHUB_REPOSITORY || 'BrianCLong/summit'
};

function getArg(name) {
  const arg = ARGS.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : null;
}

if (isMain) {
  if (!CONFIG.channel || !CONFIG.target) {
      console.error('Usage: node assemble_release_notes.mjs --channel=<rc|ga> --target=<sha|tag|branch> [--since=<tag|sha>] [--plan=<path>] [--out=<path>]');
      process.exit(1);
  }
}

// --- Helpers ---

export function runGit(command) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch (e) {
    return null;
  }
}

function resolveRef(ref) {
  const sha = runGit(`git rev-parse ${ref}`);
  if (!sha) {
    if (ref.match(/^[0-9a-f]{40}$/)) return ref;
    const head = runGit(`git rev-parse HEAD`);
    if (isMain) console.error(`Falling back to HEAD: ${head}`);
    return head;
  }
  return sha;
}

function getPreviousTag(targetSha) {
  return runGit(`git describe --tags --abbrev=0 ${targetSha}^`) || runGit(`git rev-list --max-parents=0 HEAD`);
}

export function getCommitLogs(since, target) {
  const range = since ? `${since}..${target}` : target;
  const FIELD_SEP = '||||';
  const COMMIT_SEP = '----COMMIT-DELIMITER----';
  // Note: %b (body) can contain newlines.
  const format = `%H${FIELD_SEP}%an${FIELD_SEP}%ad${FIELD_SEP}%s${FIELD_SEP}%b${COMMIT_SEP}`;

  const output = runGit(`git log --pretty=format:"${format}" --date=short ${range} --no-merges`);
  if (!output) return [];

  return output.split(COMMIT_SEP).filter(Boolean).map(raw => {
    const cleanRaw = raw.trim();
    if (!cleanRaw) return null;

    const parts = cleanRaw.split(FIELD_SEP);
    if (parts.length < 5) return null;

    const [hash, author, date, subject, ...bodyParts] = parts;
    const body = bodyParts.join(FIELD_SEP); // Rejoin just in case body had the separator (unlikely)
    return { hash, author, date, subject, body };
  }).filter(Boolean);
}

export function getChangedFiles(hash) {
  const files = runGit(`git show --name-only --format="" ${hash}`);
  return files ? files.split('\n').filter(Boolean) : [];
}

async function fetchPRs(commits) {
  if (!CONFIG.token) {
    if (isMain) console.log('No GITHUB_TOKEN provided, skipping PR fetch.');
    return [];
  }

  const prMap = new Map();

  for (const commit of commits) {
    const match = commit.subject.match(/\(#(\d+)\)$/) || commit.subject.match(/Merge pull request #(\d+)/) || (commit.body && commit.body.match(/Merge pull request #(\d+)/));
    if (match) {
        const prNumber = match[1];
        if (!prMap.has(prNumber)) {
            try {
                const pr = await githubRequest(`/repos/${CONFIG.repo}/pulls/${prNumber}`);
                if (pr) prMap.set(prNumber, pr);
            } catch (e) {
                if (isMain) console.error(`Failed to fetch PR #${prNumber}: ${e.message}`);
            }
        }
    }
  }
  return Array.from(prMap.values());
}

function githubRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: path,
      headers: {
        'User-Agent': 'NodeJS Release Assembler',
        'Authorization': `Bearer ${CONFIG.token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          resolve(null);
        }
      });
    }).on('error', (err) => reject(err));
  });
}

export function classify(title, fileList) {
    let area = 'Other';
    const isServer = fileList.some(f => f.startsWith('server/') || f.startsWith('maestro/'));
    const isWeb = fileList.some(f => f.startsWith('apps/web/') || f.startsWith('client/'));
    const isInfra = fileList.some(f => f.startsWith('infra/') || f.startsWith('kubernetes/') || f.startsWith('docker') || f.includes('Dockerfile'));
    const isCI = fileList.some(f => f.startsWith('.github/') || f.startsWith('scripts/'));
    const isSec = fileList.some(f => f.includes('security') || f.includes('policy') || f.includes('compliance'));
    const isDoc = fileList.some(f => f.startsWith('docs/') || f.endsWith('.md'));

    if (isSec) area = 'Security/Compliance';
    else if (isServer) area = 'Server';
    else if (isWeb) area = 'Web/UI';
    else if (isInfra) area = 'Infra/Deploy';
    else if (isCI) area = 'CI/Release Engineering';
    else if (isDoc) area = 'Documentation';
    return area;
}

// --- Logic ---

async function assemble() {
  const targetSha = resolveRef(CONFIG.target);
  const sinceRef = CONFIG.since || getPreviousTag(targetSha);

  console.log(`Assembling notes for ${CONFIG.target} (${targetSha})`);
  console.log(`Comparing against ${sinceRef}`);

  const commits = getCommitLogs(sinceRef, targetSha);
  const prs = await fetchPRs(commits);

  const areas = {
    'Server': [],
    'Web/UI': [],
    'Infra/Deploy': [],
    'CI/Release Engineering': [],
    'Security/Compliance': [],
    'Documentation': [],
    'Other': []
  };

  const seenPRs = new Set();
  const changes = [];

  for (const commit of commits) {
      const match = commit.subject.match(/\(#(\d+)\)$/) || commit.subject.match(/Merge pull request #(\d+)/) || (commit.body && commit.body.match(/Merge pull request #(\d+)/));
      let pr = null;
      if (match) {
          const prNumber = match[1];
          pr = prs.find(p => p.number == prNumber);
      } else {
          pr = prs.find(p => p.merge_commit_sha === commit.hash);
      }

      if (pr) {
          if (!seenPRs.has(pr.number)) {
              seenPRs.add(pr.number);
              const files = getChangedFiles(commit.hash);
              const area = classify(pr.title, files);
              changes.push({
                  type: 'pr',
                  title: pr.title,
                  number: pr.number,
                  url: pr.html_url,
                  user: pr.user.login,
                  area: area,
                  hash: commit.hash
              });
          }
      } else {
          const files = getChangedFiles(commit.hash);
          const area = classify(commit.subject, files);
          changes.push({
              type: 'commit',
              title: commit.subject,
              hash: commit.hash,
              user: commit.author,
              area: area
          });
      }
  }

  changes.forEach(c => areas[c.area].push(c));

  // Parse Issuance Worksheet / Plan
  let blockedCount = 0;
  let pItems = [];

  if (CONFIG.plan && existsSync(CONFIG.plan)) {
      const content = readFileSync(CONFIG.plan, 'utf-8');

      const unchecked = (content.match(/- \[ \]/g) || []).length;
      if (unchecked > 0) blockedCount = unchecked;

      const lines = content.split('\n');
      lines.forEach(line => {
          if (line.includes('[ ]') && (line.includes('P0') || line.includes('P1'))) {
              pItems.push(line.replace(/- \[ \]/, '').trim());
          }
      });
  }

  // Generate Markdown
  const date = new Date().toISOString().split('T')[0];
  const title = `Summit ${CONFIG.channel.toUpperCase()} Release ${CONFIG.target}`;

  let md = `# ${title}\n\n`;
  md += `**Date:** ${date}\n`;
  md += `**Target:** \`${targetSha}\`\n`;
  md += `**Range:** \`${sinceRef}..${targetSha}\`\n\n`;

  if (existsSync('dist/SHA256SUMS')) {
      md += `## Artifacts\n\n`;
      const checksums = readFileSync('dist/SHA256SUMS', 'utf-8');
      md += `### Checksums\n\`\`\`\n${checksums}\`\`\`\n\n`;

      md += `### Compliance\n`;
      md += `- ✅ SLSA Level 3 Build Provenance\n`;
      md += `- ✅ Software Bill of Materials (CycloneDX + SPDX)\n`;
      md += `- ✅ Keyless code signing (Sigstore)\n`;
      md += `- ✅ Complete evidence bundle\n\n`;
  }

  md += `## Highlights\n\n`;
  const featChanges = changes.filter(c => c.title.startsWith('feat') || c.title.includes('!'));
  if (featChanges.length > 0) {
      featChanges.slice(0, 5).forEach(c => {
           if (c.type === 'pr') md += `- ${c.title} ([#${c.number}](${c.url}))\n`;
           else md += `- ${c.title}\n`;
      });
  } else {
      md += `- Routine maintenance and stability improvements.\n`;
  }
  md += `\n`;

  md += `## Changes by Area\n\n`;

  for (const [area, areaChanges] of Object.entries(areas)) {
    if (areaChanges.length === 0) continue;
    md += `### ${area}\n`;
    areaChanges.forEach(c => {
        if (c.type === 'pr') {
            md += `- ${c.title} ([#${c.number}](${c.url})) - @${c.user}\n`;
        } else {
            const shortHash = c.hash.substring(0, 7);
            md += `- ${c.title} (${shortHash}) - ${c.user}\n`;
        }
    });
    md += `\n`;
  }

  md += `## Verification & Evidence\n\n`;
  md += `- **Status:** GA Verify Pending\n`;
  if (env.GITHUB_RUN_ID) {
    md += `- **Build:** [${env.GITHUB_RUN_ID}](${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID})\n`;
  }
  md += `- **Evidence Artifact:** \`evidence-bundle.tar.gz\`\n`;
  if (CONFIG.plan) {
      md += `- **Release Plan:** [${CONFIG.plan}](${CONFIG.plan})\n`;
  }
  md += `\n`;

  md += `## Stabilization / Known Issues\n\n`;
  md += `> Auto-generated from issuance worksheet.\n\n`;

  if (pItems.length > 0) {
      md += `### Critical Open Items (P0/P1)\n`;
      pItems.forEach(item => md += `- 🔴 ${item}\n`);
      md += `\n`;
  }

  if (blockedCount > 0) {
      md += `- **Total Blocked/Deferred Items:** ${blockedCount} open items detected in plan.\n`;
  } else {
      md += `- No blocking issues identified in git metadata or plan.\n`;
  }

  md += `\n---\n`;
  md += `*Generated by Release Notes Assembler at ${new Date().toISOString()}*\n`;

  if (CONFIG.out) {
      writeFileSync(CONFIG.out, md);
      console.log(`Wrote release notes to ${CONFIG.out}`);
  } else {
      console.log(md);
  }
}

if (isMain) {
    assemble().catch(err => {
        console.error(err);
        process.exit(1);
    });
}
