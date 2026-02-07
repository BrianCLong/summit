import fs from 'node:fs/promises';
import path from 'node:path';

const ISO_TIMESTAMP = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/;

const ensureArray = (value) => (Array.isArray(value) ? value : []);

const loadJson = async (filePath) => {
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content);
};

const findTimestampLeak = (value, trail = '') => {
  if (typeof value === 'string' && ISO_TIMESTAMP.test(value)) {
    return trail || '<root>';
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      const hit = findTimestampLeak(value[i], `${trail}[${i}]`);
      if (hit) {
        return hit;
      }
    }
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      const nextTrail = trail ? `${trail}.${key}` : key;
      const hit = findTimestampLeak(child, nextTrail);
      if (hit) {
        return hit;
      }
    }
  }
  return null;
};

const normalizeEntries = (indexData) => {
  if (!indexData) {
    return [];
  }
  if (Array.isArray(indexData.items)) {
    return indexData.items;
  }
  if (indexData.items && typeof indexData.items === 'object') {
    return Object.entries(indexData.items).map(([evidenceId, files]) => ({
      evidence_id: evidenceId,
      files,
    }));
  }
  if (Array.isArray(indexData)) {
    return indexData;
  }
  return [];
};

const validateJsonFile = async (filePath) => {
  const data = await loadJson(filePath);
  return data;
};

const verifyBundleFiles = async (rootDir, bundlePath) => {
  const reportPath = path.join(rootDir, bundlePath, 'report.json');
  const metricsPath = path.join(rootDir, bundlePath, 'metrics.json');
  const stampPath = path.join(rootDir, bundlePath, 'stamp.json');

  const [report, metrics] = await Promise.all([
    validateJsonFile(reportPath),
    validateJsonFile(metricsPath),
  ]);
  await validateJsonFile(stampPath);

  const reportLeak = findTimestampLeak(report, 'report');
  if (reportLeak) {
    return `timestamp leak in ${bundlePath}/report.json at ${reportLeak}`;
  }
  const metricsLeak = findTimestampLeak(metrics, 'metrics');
  if (metricsLeak) {
    return `timestamp leak in ${bundlePath}/metrics.json at ${metricsLeak}`;
  }
  if (report?.policy?.write_enabled === true) {
    return `write_enabled must be false in ${bundlePath}/report.json`;
  }
  return null;
};

export const verifyEvidenceBundles = async ({
  rootDir = process.cwd(),
  indexPath = 'evidence/index.json',
  bundlesDir = 'evidence/bundles',
} = {}) => {
  const errors = [];
  const resolvedIndex = path.join(rootDir, indexPath);
  const indexData = await validateJsonFile(resolvedIndex);
  const entries = normalizeEntries(indexData);

  if (entries.length === 0) {
    errors.push('evidence/index.json has no items');
  }

  const entryByReport = new Map();
  for (const entry of entries) {
    if (!entry?.files?.report || !entry?.files?.metrics || !entry?.files?.stamp) {
      errors.push(`missing files for evidence entry ${entry?.evidence_id ?? '<unknown>'}`);
      continue;
    }
    const reportFile = path.join(rootDir, entry.files.report);
    const metricsFile = path.join(rootDir, entry.files.metrics);
    const stampFile = path.join(rootDir, entry.files.stamp);

    try {
      await fs.access(reportFile);
      await fs.access(metricsFile);
      await fs.access(stampFile);
    } catch (error) {
      errors.push(`missing evidence artifact for ${entry.evidence_id}`);
    }

    entryByReport.set(entry.files.report, entry);
  }

  const bundlesPath = path.join(rootDir, bundlesDir);
  const bundleEntries = await fs.readdir(bundlesPath, { withFileTypes: true });
  const bundleDirs = bundleEntries.filter((entry) => entry.isDirectory());

  for (const entry of bundleDirs) {
    const bundlePath = path.join(bundlesDir, entry.name);
    const reportRelative = path.join(bundlePath, 'report.json');
    const reportPath = path.join(rootDir, reportRelative);
    let reportData = null;
    try {
      reportData = await validateJsonFile(reportPath);
    } catch (error) {
      errors.push(`missing or invalid report.json in ${bundlePath}`);
      continue;
    }

    const evidenceId = reportData?.evidence_id ?? '';
    if (!evidenceId.startsWith('EVD-CLAUDE-OBSIDIAN-')) {
      continue;
    }

    if (!entryByReport.has(reportRelative)) {
      errors.push(`missing evidence index entry for ${bundlePath}`);
      continue;
    }
    const bundleError = await verifyBundleFiles(rootDir, bundlePath);
    if (bundleError) {
      errors.push(bundleError);
    }
  }

  if (errors.length > 0) {
    const message = errors.map((msg) => `- ${msg}`).join('\n');
    throw new Error(`evidence-verify failed:\n${message}`);
  }

  return { bundlesChecked: bundleDirs.length };
};

const parseArgs = (argv) => {
  const args = { rootDir: process.cwd(), indexPath: 'evidence/index.json', bundlesDir: 'evidence/bundles' };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--root' && argv[i + 1]) {
      args.rootDir = argv[i + 1];
    }
    if (argv[i] === '--index' && argv[i + 1]) {
      args.indexPath = argv[i + 1];
    }
    if (argv[i] === '--bundles' && argv[i + 1]) {
      args.bundlesDir = argv[i + 1];
    }
  }
  return args;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs(process.argv.slice(2));
  verifyEvidenceBundles(args)
    .then((result) => {
      console.log(`evidence-verify: PASS (${result.bundlesChecked} bundles)`);
    })
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
}
