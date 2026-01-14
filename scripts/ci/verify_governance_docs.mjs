import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';

const MAX_FILE_BYTES = 512 * 1024;
const WORKFLOW_MAX_BYTES = 512 * 1024;
const INDEX_RELATIVE_PATH = 'docs/governance/INDEX.yml';
const INDEX_MD_RELATIVE_PATH = 'docs/governance/INDEX.md';
const DOCS_DIR = 'docs/governance';
const WORKFLOWS_DIR = '.github/workflows';

const args = new Set(process.argv.slice(2));
const fix = args.has('--fix');

// TODO(issue): add scripts/ci/__tests__/governance_docs_verifier.test.mjs when a harness exists.

if (fix && (process.env.GITHUB_ACTIONS === '1' || process.env.GITHUB_ACTIONS === 'true')) {
  console.error('Refusing to run --fix in CI. Run locally instead.');
  process.exit(1);
}

const repoRoot = process.cwd();

const indexPath = path.join(repoRoot, INDEX_RELATIVE_PATH);
const indexMdPath = path.join(repoRoot, INDEX_MD_RELATIVE_PATH);
const packageJsonPath = path.join(repoRoot, 'package.json');
const workflowsPath = path.join(repoRoot, WORKFLOWS_DIR);

const violations = [];

const addViolation = ({ type, path: violationPath, message, remediation }) => {
  violations.push({
    type,
    path: violationPath,
    message,
    remediation,
  });
};

const readFileLimited = async (filePath, maxBytes) => {
  const stats = await fs.stat(filePath);
  if (stats.size > maxBytes) {
    throw new Error(`File too large: ${filePath} (${stats.size} bytes)`);
  }
  return fs.readFile(filePath, 'utf8');
};

const getGitSha = () => {
  const envSha = process.env.GITHUB_SHA;
  if (envSha) {
    return envSha;
  }
  return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
};

const normalizeJobName = (raw) => {
  const trimmed = raw.replace(/\s+#.*$/, '').trim();
  return trimmed.replace(/^['"]|['"]$/g, '');
};

const parseWorkflowJobNames = (contents) => {
  const names = [];
  const lines = contents.split(/\r?\n/);
  let inJobs = false;
  let currentJobId = null;

  for (const line of lines) {
    if (!inJobs && /^\s*jobs:\s*$/.test(line)) {
      inJobs = true;
      currentJobId = null;
      continue;
    }

    if (inJobs && /^\S/.test(line) && !/^\s*jobs:\s*$/.test(line)) {
      inJobs = false;
      currentJobId = null;
    }

    if (!inJobs) {
      continue;
    }

    const jobMatch = line.match(/^\s{2}([A-Za-z0-9_-]+):\s*$/);
    if (jobMatch) {
      currentJobId = jobMatch[1];
      continue;
    }

    const nameMatch = line.match(/^\s{4}name:\s*(.+)$/);
    if (nameMatch && currentJobId) {
      const normalized = normalizeJobName(nameMatch[1]);
      if (normalized) {
        names.push(normalized);
      }
    }
  }

  return names;
};

const extractScriptKey = (command) => {
  const trimmed = command.trim();
  const pnpmMatch = trimmed.match(/^pnpm(?:\s+run)?\s+([^\s]+)\s*$/);
  if (pnpmMatch) {
    return pnpmMatch[1];
  }
  if (!trimmed.includes(' ')) {
    return trimmed;
  }
  return null;
};

const validateIndexSchema = async (indexData) => {
  if (!indexData || typeof indexData !== 'object') {
    addViolation({
      type: 'schema',
      path: INDEX_RELATIVE_PATH,
      message: 'INDEX.yml must be a YAML object with schema_version and sections.',
      remediation: 'Define schema_version and sections in docs/governance/INDEX.yml.',
    });
    return { sections: [] };
  }

  if (typeof indexData.schema_version !== 'number') {
    addViolation({
      type: 'schema',
      path: `${INDEX_RELATIVE_PATH}:schema_version`,
      message: 'schema_version must be a number.',
      remediation: 'Set schema_version to a numeric value (e.g., 1).',
    });
  }

  if (!Array.isArray(indexData.sections)) {
    addViolation({
      type: 'schema',
      path: `${INDEX_RELATIVE_PATH}:sections`,
      message: 'sections must be an array.',
      remediation: 'Define sections as an array of section objects.',
    });
    return { sections: [] };
  }

  const seenItemIds = new Set();
  const statuses = new Set(['active', 'planned']);

  for (const [sectionIndex, section] of indexData.sections.entries()) {
    const sectionPath = `${INDEX_RELATIVE_PATH}:sections[${sectionIndex}]`;
    if (!section || typeof section !== 'object') {
      addViolation({
        type: 'schema',
        path: sectionPath,
        message: 'section must be an object with id, title, and items.',
        remediation: 'Ensure each section has id, title, and items fields.',
      });
      continue;
    }

    if (typeof section.id !== 'string' || section.id.trim() === '') {
      addViolation({
        type: 'schema',
        path: `${sectionPath}.id`,
        message: 'section.id must be a non-empty string.',
        remediation: 'Set a stable section id string.',
      });
    }

    if (typeof section.title !== 'string' || section.title.trim() === '') {
      addViolation({
        type: 'schema',
        path: `${sectionPath}.title`,
        message: 'section.title must be a non-empty string.',
        remediation: 'Set a human-readable section title.',
      });
    }

    if (!Array.isArray(section.items)) {
      addViolation({
        type: 'schema',
        path: `${sectionPath}.items`,
        message: 'section.items must be an array.',
        remediation: 'Define items as an array under each section.',
      });
      continue;
    }

    for (const [itemIndex, item] of section.items.entries()) {
      const itemPath = `${sectionPath}.items[${itemIndex}]`;
      if (!item || typeof item !== 'object') {
        addViolation({
          type: 'schema',
          path: itemPath,
          message: 'item must be an object with id, title, status, and doc.',
          remediation: 'Ensure each item is an object with required fields.',
        });
        continue;
      }

      if (typeof item.id !== 'string' || item.id.trim() === '') {
        addViolation({
          type: 'schema',
          path: `${itemPath}.id`,
          message: 'item.id must be a non-empty string.',
          remediation: 'Set a stable item id string.',
        });
      } else if (seenItemIds.has(item.id)) {
        addViolation({
          type: 'schema',
          path: `${itemPath}.id`,
          message: `item.id '${item.id}' is duplicated.`,
          remediation: 'Ensure each item id is unique across INDEX.yml.',
        });
      } else {
        seenItemIds.add(item.id);
      }

      if (typeof item.title !== 'string' || item.title.trim() === '') {
        addViolation({
          type: 'schema',
          path: `${itemPath}.title`,
          message: 'item.title must be a non-empty string.',
          remediation: 'Set a human-readable item title.',
        });
      }

      if (typeof item.status !== 'string' || !statuses.has(item.status)) {
        addViolation({
          type: 'schema',
          path: `${itemPath}.status`,
          message: 'item.status must be "active" or "planned".',
          remediation: 'Set item.status to active or planned.',
        });
      }

      if (typeof item.doc !== 'string' || item.doc.trim() === '') {
        addViolation({
          type: 'schema',
          path: `${itemPath}.doc`,
          message: 'item.doc must be a non-empty string.',
          remediation: 'Set item.doc to the document path.',
        });
      } else {
        const docPath = path.join(repoRoot, item.doc);
        try {
          await fs.access(docPath);
        } catch (error) {
          addViolation({
            type: 'doc',
            path: `${itemPath}.doc`,
            message: `Document not found at ${item.doc}.`,
            remediation: 'Update item.doc to an existing document path.',
          });
        }
      }

      if (item.commands !== undefined && !Array.isArray(item.commands)) {
        addViolation({
          type: 'schema',
          path: `${itemPath}.commands`,
          message: 'item.commands must be an array of strings.',
          remediation: 'Provide commands as a string array or remove the field.',
        });
      }

      if (Array.isArray(item.commands)) {
        item.commands.forEach((command, commandIndex) => {
          if (typeof command !== 'string' || command.trim() === '') {
            addViolation({
              type: 'schema',
              path: `${itemPath}.commands[${commandIndex}]`,
              message: 'commands entries must be non-empty strings.',
              remediation: 'Replace empty command entries with valid script keys.',
            });
          }
        });
      }

      if (item.jobs !== undefined && !Array.isArray(item.jobs)) {
        addViolation({
          type: 'schema',
          path: `${itemPath}.jobs`,
          message: 'item.jobs must be an array of strings.',
          remediation: 'Provide jobs as a string array or remove the field.',
        });
      }

      if (Array.isArray(item.jobs)) {
        item.jobs.forEach((job, jobIndex) => {
          if (typeof job !== 'string' || job.trim() === '') {
            addViolation({
              type: 'schema',
              path: `${itemPath}.jobs[${jobIndex}]`,
              message: 'jobs entries must be non-empty strings.',
              remediation: 'Replace empty job entries with workflow job names.',
            });
          }
        });
      }

      if (item.evidence !== undefined && !Array.isArray(item.evidence)) {
        addViolation({
          type: 'schema',
          path: `${itemPath}.evidence`,
          message: 'item.evidence must be an array of strings.',
          remediation: 'Provide evidence as a string array or remove the field.',
        });
      }

      if (Array.isArray(item.evidence)) {
        item.evidence.forEach((entry, entryIndex) => {
          if (typeof entry !== 'string' || entry.trim() === '') {
            addViolation({
              type: 'schema',
              path: `${itemPath}.evidence[${entryIndex}]`,
              message: 'evidence entries must be non-empty strings.',
              remediation: 'Replace empty evidence entries with paths.',
            });
          }
        });
      }
    }
  }

  return indexData;
};

const renderIndex = (indexData) => {
  const lines = [];
  lines.push('# Governance Documentation Index');
  lines.push('');
  lines.push('Canonical index for Summit governance documentation and enforcement gates.');
  lines.push('');

  for (const section of indexData.sections) {
    lines.push(`## ${section.title}`);
    lines.push('');

    for (const item of section.items) {
      const relativeDoc = path.posix.relative(DOCS_DIR, item.doc).replace(/\\/g, '/');
      lines.push(`### ${item.title}`);
      lines.push('');
      lines.push(`- **ID:** \`${item.id}\``);
      lines.push(`- **Status:** ${item.status}`);
      lines.push(`- **Document:** [${relativeDoc}](${relativeDoc})`);

      if (Array.isArray(item.commands) && item.commands.length > 0) {
        const commands = item.commands.map((command) => `\`${command}\``).join(', ');
        lines.push(`- **Commands:** ${commands}`);
      }

      if (Array.isArray(item.jobs) && item.jobs.length > 0) {
        const jobs = item.jobs.map((job) => `\`${job}\``).join(', ');
        lines.push(`- **Jobs:** ${jobs}`);
      }

      if (Array.isArray(item.evidence) && item.evidence.length > 0) {
        const evidence = item.evidence.map((entry) => `\`${entry}\``).join(', ');
        lines.push(`- **Evidence:** ${evidence}`);
      }

      lines.push('');
    }
  }

  lines.push('---');
  lines.push('Derived from docs/governance/INDEX.yml. Do not edit manually.');
  lines.push('');

  return lines.join('\n');
};

const writeReportFiles = async ({
  outDir,
  renderedIndex,
  workflowJobNames,
  allowBestEffortWorkflowParse,
  fixApplied,
}) => {
  await fs.mkdir(outDir, { recursive: true });

  const sortedViolations = [...violations].sort((a, b) => {
    const pathCompare = a.path.localeCompare(b.path);
    if (pathCompare !== 0) {
      return pathCompare;
    }
    const typeCompare = a.type.localeCompare(b.type);
    if (typeCompare !== 0) {
      return typeCompare;
    }
    return a.message.localeCompare(b.message);
  });

  const report = {
    summary: {
      passed: sortedViolations.length === 0,
      violation_count: sortedViolations.length,
    },
    index: {
      yml_path: INDEX_RELATIVE_PATH,
      md_path: INDEX_MD_RELATIVE_PATH,
    },
    workflow_parse: {
      allow_best_effort: allowBestEffortWorkflowParse,
      job_name_count: workflowJobNames.length,
    },
    fix_applied: fixApplied,
    violations: sortedViolations,
  };

  const reportMdLines = [];
  reportMdLines.push('# Governance Docs Integrity Report');
  reportMdLines.push('');
  reportMdLines.push(`Status: ${report.summary.passed ? 'PASS' : 'FAIL'}`);
  reportMdLines.push(`Violations: ${report.summary.violation_count}`);
  reportMdLines.push('');

  if (sortedViolations.length > 0) {
    reportMdLines.push('## Violations');
    reportMdLines.push('');
    sortedViolations.forEach((violation) => {
      reportMdLines.push(`- **${violation.type}** \`${violation.path}\`: ${violation.message}`);
      reportMdLines.push(`  - Remediation: ${violation.remediation}`);
    });
    reportMdLines.push('');
  }

  reportMdLines.push('## Workflow Job Parse Notes');
  reportMdLines.push('');
  reportMdLines.push('Workflow job names are discovered via a best-effort scan for job-level name fields in .github/workflows/*.yml.');
  reportMdLines.push('Dynamic workflow name generation or unconventional YAML formatting can cause missed matches.');
  reportMdLines.push('');

  await fs.writeFile(path.join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(path.join(outDir, 'report.md'), `${reportMdLines.join('\n')}\n`);
  await fs.writeFile(path.join(outDir, 'index.rendered.md'), renderedIndex);

  const stamp = {
    sha: getGitSha(),
    generated_at: new Date().toISOString(),
  };

  await fs.writeFile(path.join(outDir, 'stamp.json'), `${JSON.stringify(stamp, null, 2)}\n`);
};

const main = async () => {
  let indexData;
  let renderedIndex = '';
  let workflowJobNames = [];
  let fixApplied = false;
  const allowBestEffortWorkflowParse = true;

  try {
    const indexContents = await readFileLimited(indexPath, MAX_FILE_BYTES);
    indexData = yaml.load(indexContents);
  } catch (error) {
    addViolation({
      type: 'schema',
      path: INDEX_RELATIVE_PATH,
      message: `Failed to read or parse INDEX.yml: ${error.message}`,
      remediation: 'Ensure docs/governance/INDEX.yml exists and is valid YAML.',
    });
    indexData = { sections: [] };
  }

  indexData = await validateIndexSchema(indexData);

  try {
    const packageContents = await readFileLimited(packageJsonPath, MAX_FILE_BYTES);
    const packageJson = JSON.parse(packageContents);
    const scripts = packageJson.scripts || {};

    const workflowFiles = await fs.readdir(workflowsPath, { withFileTypes: true });
    const workflowNames = [];
    for (const entry of workflowFiles) {
      if (!entry.isFile()) {
        continue;
      }
      if (!entry.name.endsWith('.yml') && !entry.name.endsWith('.yaml')) {
        continue;
      }
      const workflowFilePath = path.join(workflowsPath, entry.name);
      const contents = await readFileLimited(workflowFilePath, WORKFLOW_MAX_BYTES);
      workflowNames.push(...parseWorkflowJobNames(contents));
    }

    workflowJobNames = Array.from(new Set(workflowNames)).sort((a, b) => a.localeCompare(b));

    for (const [sectionIndex, section] of indexData.sections.entries()) {
      for (const [itemIndex, item] of section.items.entries()) {
        if (item.status !== 'active') {
          continue;
        }
        const itemPath = `${INDEX_RELATIVE_PATH}:sections[${sectionIndex}].items[${itemIndex}]`;

        if (Array.isArray(item.commands)) {
          for (const [commandIndex, command] of item.commands.entries()) {
            const scriptKey = extractScriptKey(command);
            if (!scriptKey) {
              addViolation({
                type: 'command',
                path: `${itemPath}.commands[${commandIndex}]`,
                message: `Unsupported command format: ${command}.`,
                remediation: 'Use "pnpm <script>", "pnpm run <script>", or a direct script key.',
              });
              continue;
            }
            if (!scripts[scriptKey]) {
              addViolation({
                type: 'command',
                path: `${itemPath}.commands[${commandIndex}]`,
                message: `Command script "${scriptKey}" does not exist in package.json.`,
                remediation: `Add the script "${scriptKey}" to package.json or change the INDEX.yml entry.`,
              });
            }
          }
        }

        if (Array.isArray(item.jobs)) {
          for (const [jobIndex, job] of item.jobs.entries()) {
            if (!workflowJobNames.includes(job)) {
              addViolation({
                type: 'job',
                path: `${itemPath}.jobs[${jobIndex}]`,
                message: `Workflow job "${job}" not found.`,
                remediation: 'Update INDEX.yml to a valid workflow job name or mark the item planned.',
              });
            }
          }
        }
      }
    }
  } catch (error) {
    addViolation({
      type: 'config',
      path: 'package.json',
      message: `Failed to read package.json or workflows: ${error.message}`,
      remediation: 'Ensure package.json and .github/workflows are readable.',
    });
  }

  renderedIndex = renderIndex(indexData);

  if (fix) {
    await fs.writeFile(indexMdPath, renderedIndex);
    fixApplied = true;
  } else {
    try {
      const currentIndex = await readFileLimited(indexMdPath, MAX_FILE_BYTES);
      if (currentIndex !== renderedIndex) {
        addViolation({
          type: 'drift',
          path: INDEX_MD_RELATIVE_PATH,
          message: 'INDEX.md does not match the rendered output from INDEX.yml.',
          remediation: 'Run pnpm ci:docs-governance:fix to regenerate docs/governance/INDEX.md.',
        });
      }
    } catch (error) {
      addViolation({
        type: 'drift',
        path: INDEX_MD_RELATIVE_PATH,
        message: `INDEX.md is missing or unreadable: ${error.message}`,
        remediation: 'Run pnpm ci:docs-governance:fix to regenerate docs/governance/INDEX.md.',
      });
    }
  }

  const sha = getGitSha();
  const outDir = path.join(repoRoot, 'artifacts/governance/docs-integrity', sha);
  await writeReportFiles({
    outDir,
    renderedIndex,
    workflowJobNames,
    allowBestEffortWorkflowParse,
    fixApplied,
  });

  if (violations.length > 0) {
    process.exitCode = 1;
  }
};

main();
