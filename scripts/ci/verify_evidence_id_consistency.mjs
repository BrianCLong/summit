import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

// Utilities
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../');

// Configuration Defaults
const POLICY_FILE = path.join(__dirname, 'evidence_policy.json');

// Colors for console output
const colors = {
  red: (msg) => `\x1b[31m${msg}\x1b[0m`,
  green: (msg) => `\x1b[32m${msg}\x1b[0m`,
  yellow: (msg) => `\x1b[33m${msg}\x1b[0m`,
  cyan: (msg) => `\x1b[36m${msg}\x1b[0m`
};

// Artifact paths
const ARTIFACTS_DIR = path.join(REPO_ROOT, 'artifacts/governance/evidence-id-consistency');

async function main() {
  if (process.argv.includes('--help')) {
    console.log(`
Usage: node verify_evidence_id_consistency.mjs [options]

Options:
  --help    Show this help message

Environment Variables:
  GITHUB_SHA    The commit SHA to generate artifacts for (defaults to git rev-parse HEAD)
    `);
    process.exit(0);
  }

  const commitSha = process.env.GITHUB_SHA || await getGitSha();
  const artifactDir = path.join(ARTIFACTS_DIR, commitSha);

  // Ensure artifact directory exists
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  const config = loadConfig();
  const catalog = loadCatalog(config.evidenceCatalogPath);

  console.log(colors.cyan('Starting Evidence ID Consistency Check...'));
  console.log(`Scanning: ${config.docsPath}`);
  console.log(`Catalog: ${config.evidenceCatalogPath}`);

  const findings = await scanDocs(config.docsPath, catalog);
  const report = generateReport(findings, catalog);

  // Check policy for missing IDs
  if (findings.missing.length > 0) {
    if (config.missingIdHandling === 'error') {
      report.status = 'failed';
    } else if (config.missingIdHandling === 'warn' && report.status !== 'failed') {
      report.status = 'warning';
    }
  }

  // Write artifacts
  writeArtifacts(artifactDir, report);

  // Exit based on policy
  if (report.status === 'failed') {
    console.error(colors.red('\nEvidence ID Consistency Check Failed. See report for details.'));
    // Print details to console for easier debugging in CI
    if (report.violations && report.violations.length > 0) {
      console.error(colors.red('Violations:'));
      report.violations.forEach(v => console.error(`  - ${v.message} at ${v.file}:${v.line}`));
    }
    if (report.missing && report.missing.length > 0) {
      console.error(colors.red('Missing Active IDs:'));
      report.missing.forEach(m => console.error(`  - ${m.message}`));
    }
    process.exit(1);
  } else if (report.status === 'warning') {
    console.warn(colors.yellow('\nEvidence ID Consistency Check Passed with Warnings.'));
    if (report.missing && report.missing.length > 0) {
      console.warn(colors.yellow('Missing Active IDs:'));
      report.missing.forEach(m => console.warn(`  - ${m.message}`));
    }
    process.exit(0);
  } else {
    console.log(colors.green('\nEvidence ID Consistency Check Passed.'));
    process.exit(0);
  }
}

async function getGitSha() {
  try {
    const { execSync } = await import('child_process');
    return execSync('git rev-parse HEAD').toString().trim();
  } catch (e) {
    return 'unknown-sha';
  }
}

function loadConfig() {
  if (fs.existsSync(POLICY_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(POLICY_FILE, 'utf8'));
    } catch (e) {
      console.warn(colors.yellow(`Failed to load policy file, using defaults: ${e.message}`));
    }
  }
  return {
    evidenceCatalogPath: 'docs/governance/evidence_catalog.json',
    docsPath: 'docs/governance',
    missingIdHandling: 'error',
    unknownIdHandling: 'error'
  };
}

function loadCatalog(catalogPath) {
  const fullPath = path.resolve(REPO_ROOT, catalogPath);
  if (!fs.existsSync(fullPath)) {
    console.error(colors.red(`Evidence catalog not found at: ${fullPath}`));
    process.exit(2); // Operational error
  }
  try {
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  } catch (e) {
    console.error(colors.red(`Failed to parse evidence catalog: ${e.message}`));
    process.exit(2);
  }
}

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      if (file.endsWith('.md')) {
        arrayOfFiles.push(path.join(dirPath, "/", file));
      }
    }
  });

  return arrayOfFiles;
}

async function scanDocs(docsDir, catalog) {
  const fullDocsPath = path.resolve(REPO_ROOT, docsDir);
  const files = getAllFiles(fullDocsPath);
  const findings = {
    valid: [],
    invalid: [], // Unknown IDs found in docs
    missing: []  // Known IDs not found in docs
  };

  const foundIds = new Set();
  const idRegex = /Evidence ID:\s*([A-Za-z0-9-_]+)/gi;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    // Optimization: Calculate line numbers incrementally if needed, but for now simple approach is acceptable given docs size.
    // However, to be safer:
    const lines = content.split('\n'); // Split once

    let match;
    while ((match = idRegex.exec(content)) !== null) {
      const id = match[1];
      const relativePath = path.relative(REPO_ROOT, file);
      const lineNumber = getLineNumberOptimized(content, match.index); // Use helper

      if (catalog.evidenceIds[id]) {
        findings.valid.push({ id, file: relativePath, line: lineNumber });
        foundIds.add(id);
      } else {
        findings.invalid.push({ id, file: relativePath, line: lineNumber });
      }
    }
  }

  // Check for missing IDs (if configured to do so, usually we check active ones)
  // We don't have access to config here directly unless passed, but we can return data and let main handle logic
  // actually, let's just populate missing array for all active IDs in catalog not found
  for (const [id, meta] of Object.entries(catalog.evidenceIds)) {
    if (meta.status === 'active' && !foundIds.has(id)) {
      findings.missing.push({ id, description: meta.description });
    }
  }

  // Sort for determinism
  findings.valid.sort((a, b) => (a.id + a.file).localeCompare(b.id + b.file));
  findings.invalid.sort((a, b) => (a.id + a.file).localeCompare(b.id + b.file));
  findings.missing.sort((a, b) => a.id.localeCompare(b.id));

  return findings;
}

function getLineNumberOptimized(content, index) {
  let line = 1;
  for (let i = 0; i < index; i++) {
    if (content[i] === '\n') line++;
  }
  return line;
}

function generateReport(findings, catalog) {
  const status = findings.invalid.length > 0 ? 'failed' : 'passed';
  // Deterministic report generation
  const report = {
    status,
    summary: {
      totalDocsScanned: -1, // Not tracking count here to keep simple, could add
      validIdsFound: findings.valid.length,
      invalidIdsFound: findings.invalid.length,
      missingIdsFound: findings.missing.length
    },
    violations: findings.invalid.map(f => ({
      message: `Unknown Evidence ID '${f.id}'`,
      file: f.file,
      line: f.line
    })),
    missing: findings.missing.map(f => ({
      id: f.id,
      description: f.description,
      message: `Active Evidence ID '${f.id}' not found in docs`
    })),
    validations: findings.valid.map(f => ({
      id: f.id,
      file: f.file,
      description: catalog.evidenceIds[f.id]?.description || 'No description'
    }))
  };
  return report;
}

function writeArtifacts(dir, report) {
  // report.json
  const reportJson = JSON.stringify(report, null, 2);
  fs.writeFileSync(path.join(dir, 'report.json'), reportJson);

  // report.md
  let reportMd = `# Evidence ID Consistency Report\n\n`;
  reportMd += `**Status**: ${report.status.toUpperCase()}\n`;
  reportMd += `**Date**: ${new Date().toISOString().split('T')[0]}\n\n`; // Date only for stability if re-run on same day? No, explicit timestamp might vary.
  // Actually, for determinism across reruns on same SHA, we should avoid current timestamp in the main body unless necessary.
  // The PR says "stamp.json may differ only in timestamp fields". report.md should be stable.
  // So I will remove Date from report.md to ensure byte-for-byte identity.

  reportMd = `# Evidence ID Consistency Report\n\n`;
  reportMd += `**Status**: ${report.status.toUpperCase()}\n\n`;

  reportMd += `## Summary\n`;
  reportMd += `- Valid IDs found: ${report.summary.validIdsFound}\n`;
  reportMd += `- Invalid IDs found: ${report.summary.invalidIdsFound}\n`;
  reportMd += `- Missing IDs found: ${report.summary.missingIdsFound}\n\n`;

  if (report.violations && report.violations.length > 0) {
    reportMd += `## Violations\n`;
    report.violations.forEach(v => {
      reportMd += `- **${v.message}** in \`${v.file}:${v.line}\`\n`;
    });
    reportMd += `\n`;
  }

  if (report.missing && report.missing.length > 0) {
    reportMd += `## Missing Active Evidence\n`;
    report.missing.forEach(m => {
      reportMd += `- **${m.message}** (${m.description})\n`;
    });
    reportMd += `\n`;
  }

  if (report.validations.length > 0) {
    reportMd += `## Valid Detections\n`;
    report.validations.forEach(v => {
      reportMd += `- \`${v.id}\` in \`${v.file}\` (${v.description})\n`;
    });
  }

  fs.writeFileSync(path.join(dir, 'report.md'), reportMd);

  // stamp.json
  const stamp = {
    timestamp: new Date().toISOString(),
    sha: process.env.GITHUB_SHA || 'unknown',
    reportHash: crypto.createHash('sha256').update(reportJson).digest('hex')
  };
  fs.writeFileSync(path.join(dir, 'stamp.json'), JSON.stringify(stamp, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
