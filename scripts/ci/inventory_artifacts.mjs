#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import yaml from 'js-yaml';
import { program } from 'commander';

// Helper to format bytes
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

async function main() {
  program
    .option('--root <path>', 'Root directory of artifacts', 'artifacts')
    .option('--policy <path>', 'Path to policy file', 'release-policy.yml')
    .option('--output <path>', 'Output directory for reports', 'artifacts/artifact-budget')
    .parse(process.argv);

  const options = program.opts();
  const rootDir = options.root;
  const policyPath = options.policy;
  const outputDir = options.output;

  console.log(`Inventorying artifacts in ${rootDir}...`);

  // Load policy
  let policy;
  try {
    const policyContent = await fs.readFile(policyPath, 'utf8');
    policy = yaml.load(policyContent);
  } catch (error) {
    console.error(`Failed to load policy from ${policyPath}:`, error);
    process.exit(1);
  }

  const exclusions = policy.artifact_budgets?.exclusions || [];

  // Ensure root dir exists
  try {
    await fs.access(rootDir);
  } catch {
    console.error(`Artifact root directory ${rootDir} does not exist.`);
    // If artifacts dir doesn't exist, we just output an empty report
    await writeReports(outputDir, {
      totalFiles: 0,
      totalBytes: 0,
      sections: {},
      topFiles: [],
      timestamp: new Date().toISOString()
    });
    return;
  }

  const allFilesWithStats = [];

  let totalFiles = 0;
  let totalBytes = 0;
  const sections = {};

  // Use a simpler approach with fs traversal or glob returning strings
  const globFiles = await glob('**/*', {
    cwd: rootDir,
    ignore: exclusions,
    nodir: true,
    dot: true
  });

  for (const relPath of globFiles) {
    const fullPath = path.join(rootDir, relPath);
    const stats = await fs.stat(fullPath);

    totalFiles++;
    totalBytes += stats.size;

    // Determine section (top-level folder)
    const parts = relPath.split(path.sep);
    const section = parts.length > 1 ? parts[0] : 'root';

    if (!sections[section]) {
      sections[section] = { files: 0, bytes: 0 };
    }
    sections[section].files++;
    sections[section].bytes += stats.size;

    allFilesWithStats.push({
      path: relPath,
      size: stats.size,
      section
    });
  }

  // Sort by size desc for top files
  allFilesWithStats.sort((a, b) => b.size - a.size);
  const topFiles = allFilesWithStats.slice(0, 20).map(f => ({
    path: f.path,
    size: f.size,
    formattedSize: formatBytes(f.size)
  }));

  const report = {
    totalFiles,
    totalBytes,
    formattedTotalBytes: formatBytes(totalBytes),
    sections: Object.fromEntries(
        Object.entries(sections).map(([k, v]) => [k, { ...v, formattedBytes: formatBytes(v.bytes) }])
    ),
    topFiles,
    timestamp: new Date().toISOString()
  };

  await writeReports(outputDir, report);
}

async function writeReports(outputDir, report) {
  await fs.mkdir(outputDir, { recursive: true });

  // JSON Report
  await fs.writeFile(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));

  // Markdown Report
  let md = `# Artifact Budget Inventory Report\n\n`;
  md += `**Timestamp:** ${report.timestamp}\n\n`;
  md += `## Summary\n`;
  md += `- **Total Files:** ${report.totalFiles}\n`;
  md += `- **Total Size:** ${report.formattedTotalBytes}\n\n`;

  md += `## Sections\n`;
  md += `| Section | Files | Size |\n`;
  md += `| :--- | :--- | :--- |\n`;
  for (const [name, stats] of Object.entries(report.sections)) {
    md += `| ${name} | ${stats.files} | ${stats.formattedBytes} |\n`;
  }
  md += `\n`;

  md += `## Top 20 Largest Files\n`;
  md += `| Path | Size |\n`;
  md += `| :--- | :--- |\n`;
  for (const f of report.topFiles) {
    md += `| \`${f.path}\` | ${f.formattedSize} |\n`;
  }

  await fs.writeFile(path.join(outputDir, 'report.md'), md);

  console.log(`Reports generated in ${outputDir}`);

  // Also print summary to stdout
  console.log('--- Summary ---');
  console.log(`Total Files: ${report.totalFiles}`);
  console.log(`Total Size: ${report.formattedTotalBytes}`);

  // Write to GITHUB_STEP_SUMMARY if available
  if (process.env.GITHUB_STEP_SUMMARY) {
    try {
      await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, md);
    } catch (error) {
        console.error('Failed to write to GITHUB_STEP_SUMMARY:', error);
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
