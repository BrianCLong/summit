import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const distDir = 'dist/release';
const summaryFile = path.join(distDir, 'release-summary.json');
const reportFile = path.join(distDir, 'release-report.md');

// Ensure dist dir
fs.mkdirSync(distDir, { recursive: true });

const tag = process.env.RELEASE_TAG || 'v0.0.0-dryrun';
const sha = process.env.GITHUB_SHA || '0000000';
const releaseAssetsDir = 'release-assets';

// 1. Version Consistency
let versionObserved = 'unknown';
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  versionObserved = packageJson.version;
} catch (e) {
  console.error('Could not read package.json', e);
}

const versionExpected = tag.startsWith('v') ? tag.slice(1) : tag;
const versionMatch = versionObserved === versionExpected;

// 2. Git Reachability (Best Effort)
const defaultBranch = 'main';
const reachableFromDefaultBranch = 'unknown';

// 3. Artifacts
const artifacts = [];
if (fs.existsSync(releaseAssetsDir)) {
  const files = fs.readdirSync(releaseAssetsDir);
  for (const file of files) {
    const filepath = path.join(releaseAssetsDir, file);
    if (fs.statSync(filepath).isFile()) {
      const content = fs.readFileSync(filepath);
      const sha256 = crypto.createHash('sha256').update(content).digest('hex');
      artifacts.push({
        name: file,
        path: filepath,
        sha256
      });
    }
  }
}

// 4. Notes Preview
let notesPreview = '';
const notesPath = 'release-notes.md';
if (fs.existsSync(notesPath)) {
  const notesContent = fs.readFileSync(notesPath, 'utf8');
  notesPreview = notesContent.split('\n').slice(0, 40).join('\n');
}

const summary = {
  tag,
  sha,
  defaultBranch,
  reachableFromDefaultBranch,
  versionExpected,
  versionObserved,
  versionMatch,
  artifacts,
  generatedAt: new Date().toISOString()
};

fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
console.log(`Summary written to ${summaryFile}`);

// Generate Markdown Report for Job Summary
let md = `# Release Dry-Run Summary\n\n`;
md += `**Tag:** \`${tag}\`\n`;
md += `**SHA:** \`${sha.substring(0, 7)}\`\n`;
md += `**Version Match:** ${versionMatch ? 'Yes' : 'No'} (Expected: ${versionExpected}, Got: ${versionObserved})\n`;
md += `**Generated At:** ${summary.generatedAt}\n\n`;

md += `## Artifacts\n\n`;
if (artifacts.length > 0) {
  md += `| Filename | SHA256 |\n`;
  md += `| --- | --- |\n`;
  artifacts.forEach(a => {
    md += `| ${a.name} | \`${a.sha256.substring(0, 16)}...\` |\n`;
  });
} else {
  md += `_No artifacts found in ${releaseAssetsDir}_\n`;
}

md += `\n## Release Notes Preview\n\n`;
if (notesPreview) {
  md += `\`\`\`markdown\n${notesPreview}\n\`\`\`\n`;
} else {
  md += `_No release notes file found at ${notesPath}_\n`;
}

fs.writeFileSync(reportFile, md);
console.log(`Report written to ${reportFile}`);
