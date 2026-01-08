import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { minimatch } from 'minimatch';

const POLICY_PATH = path.resolve(process.cwd(), 'release-policy.yml');
const OUTPUT_DIR = path.resolve(process.cwd(), 'artifacts/path-budget');

// Ensure output dir exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function loadPolicy() {
  try {
    const content = fs.readFileSync(POLICY_PATH, 'utf8');
    const doc = yaml.load(content);
    if (!doc.path_budgets) {
        throw new Error('No path_budgets found in policy');
    }
    return doc.path_budgets;
  } catch (e) {
    console.error(`Failed to load policy from ${POLICY_PATH}:`, e);
    process.exit(1);
  }
}

function isExcluded(filePath, excludes) {
  // filePath is relative to repo root
  // excludes are globs
  for (const pattern of excludes) {
    if (minimatch(filePath, pattern, { dot: true })) {
      return true;
    }
  }
  return false;
}

async function walk(dir, excludes, fileList = [], rootDir = dir) {
  let entries;
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch (err) {
    console.warn(`Failed to read directory ${dir}: ${err.message}`);
    return fileList;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(process.cwd(), fullPath);
    // Normalize path to use forward slashes for consistent matching and reporting
    const normalizedPath = relPath.split(path.sep).join('/');

    if (isExcluded(normalizedPath, excludes)) {
      continue;
    }

    if (entry.isDirectory()) {
      await walk(fullPath, excludes, fileList, rootDir);
    } else if (entry.isFile()) {
      fileList.push(normalizedPath);
    }
  }
  return fileList;
}

async function main() {
  const policy = await loadPolicy();
  const { scopes, excludes } = policy;

  const allFiles = new Set();

  console.log('Scanning scopes:', scopes);
  console.log('Excludes:', excludes);

  for (const scope of scopes) {
    const scopePath = path.resolve(process.cwd(), scope);
    if (!fs.existsSync(scopePath)) {
      console.warn(`Scope skipped (not found): ${scope}`);
      continue;
    }

    // If scope is file, add it
    const stat = fs.statSync(scopePath);
    if (stat.isFile()) {
        const relPath = path.relative(process.cwd(), scopePath);
        const normalizedPath = relPath.split(path.sep).join('/');
        if (!isExcluded(normalizedPath, excludes)) {
            allFiles.add(normalizedPath);
        }
    } else {
        const files = await walk(scopePath, excludes);
        files.forEach(f => allFiles.add(f));
    }
  }

  const results = [];
  for (const file of allFiles) {
    // Length: characters of relative path
    const length = file.length;
    // Depth: number of segments (always split by / since we normalized)
    const depth = file.split('/').length;

    results.push({
      file,
      length,
      depth
    });
  }

  // Sort by length desc
  const byLength = [...results].sort((a, b) => b.length - a.length);
  // Sort by depth desc
  const byDepth = [...results].sort((a, b) => b.depth - a.depth);

  const report = {
    stats: {
      totalFiles: results.length,
      maxPathLength: byLength.length > 0 ? byLength[0].length : 0,
      maxPathDepth: byDepth.length > 0 ? byDepth[0].depth : 0,
      longestFile: byLength.length > 0 ? byLength[0].file : null,
      deepestFile: byDepth.length > 0 ? byDepth[0].file : null,
    },
    top50Longest: byLength.slice(0, 50),
    top50Deepest: byDepth.slice(0, 50),
    policy: policy
  };

  const jsonPath = path.join(OUTPUT_DIR, 'report.json');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  console.log(`Report JSON written to ${jsonPath}`);

  // Generate Markdown
  let md = '# Path Budget Report\n\n';
  md += `**Total Files Scanned:** ${report.stats.totalFiles}\n\n`;
  md += `**Max Path Length:** ${report.stats.maxPathLength} chars (Limit: ${policy.normal.max_path_chars} / ${policy.release_intent.max_path_chars})\n`;
  md += `**Max Depth:** ${report.stats.maxPathDepth} segments (Limit: ${policy.normal.max_depth} / ${policy.release_intent.max_depth})\n\n`;

  if (report.stats.longestFile) {
      md += `**Longest Path:** \`${report.stats.longestFile}\`\n`;
  }
  if (report.stats.deepestFile) {
      md += `**Deepest Path:** \`${report.stats.deepestFile}\`\n`;
  }

  md += '\n## Top 50 Longest Paths\n\n';
  md += '| Length | Path |\n|---|---|\n';
  report.top50Longest.forEach(item => {
    md += `| ${item.length} | \`${item.file}\` |\n`;
  });

  md += '\n## Top 50 Deepest Paths\n\n';
  md += '| Depth | Path |\n|---|---|\n';
  report.top50Deepest.forEach(item => {
    md += `| ${item.depth} | \`${item.file}\` |\n`;
  });

  md += '\n## Remediation Guidance\n\n';
  md += '*   **Root Causes:** Deeply nested dependencies, long filenames in tests/snapshots, nested build artifacts.\n';
  md += '*   **Mitigations:**\n';
  md += '    *   Shorten checkout path (`path: r` in CI).\n';
  md += '    *   Exclude deep directories from artifacts.\n';
  md += '    *   Flatten directory structures where possible.\n';

  const mdPath = path.join(OUTPUT_DIR, 'report.md');
  fs.writeFileSync(mdPath, md);
  console.log(`Report Markdown written to ${mdPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
