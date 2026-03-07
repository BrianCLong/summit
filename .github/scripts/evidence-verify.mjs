import fs from 'node:fs';
import path from 'node:path';

export const RFC3339_PATTERN =
  /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z\b/;

export function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    evidenceDir: 'evidence',
    bundleDir: null,
    enforceWeeklyEvidenceIds: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--evidence-dir') {
      options.evidenceDir = argv[index + 1] ?? options.evidenceDir;
      index += 1;
      continue;
    }

    if (arg === '--bundle-dir') {
      options.bundleDir = argv[index + 1] ?? options.bundleDir;
      index += 1;
      continue;
    }

    if (arg === '--enforce-weekly-evidence-ids') {
      options.enforceWeeklyEvidenceIds = true;
      continue;
    }
  }

  return options;
}

export function ensurePathExists(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing: ${filePath}`);
  }
}

export function readJsonFile(filePath) {
  ensurePathExists(filePath);

  const raw = fs.readFileSync(filePath, 'utf-8');

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON: ${filePath}`);
  }
}


export function normalizeIndexEntries(evidenceIndex) {
  if (evidenceIndex && typeof evidenceIndex === 'object' && !Array.isArray(evidenceIndex)) {
    if (Array.isArray(evidenceIndex.items)) {
      return evidenceIndex.items.map((item, idx) => {
        if (!item || typeof item !== 'object') {
          throw new Error(`evidence/index.json items[${idx}] must be an object`);
        }
        const evidenceId = item.evidenceId ?? item.evidence_id ?? item.id;
        const files = Array.isArray(item.files)
          ? item.files
          : item.files && typeof item.files === 'object'
            ? Object.values(item.files)
            : item.files;
        if (typeof evidenceId !== 'string') {
          throw new Error(`evidence/index.json items[${idx}] missing evidence id`);
        }
        return [evidenceId, files];
      });
    }

    const entries = [];
    for (const [key, value] of Object.entries(evidenceIndex)) {
      if (key === 'version' || key === 'items' || key === 'meta') {
        continue;
      }

      if (Array.isArray(value)) {
        entries.push([key, value]);
        continue;
      }

      if (/^EVD-/.test(key)) {
        throw new Error(`evidence/index.json entry must be string[] for evidence id: ${key}`);
      }
    }

    return entries;
  }

  throw new Error('evidence/index.json must be an object map or { items: [] } envelope');
}

export function verifyEvidenceStructure({
  evidenceDir,
  enforceWeeklyEvidenceIds = false,
}) {
  const schemaDir = path.join(evidenceDir, 'schemas');
  const indexPath = path.join(evidenceDir, 'index.json');
  const requiredSchemas = [
    'report.schema.json',
    'metrics.schema.json',
    'stamp.schema.json',
    'index.schema.json',
  ];

  ensurePathExists(evidenceDir);
  ensurePathExists(schemaDir);

  for (const schemaName of requiredSchemas) {
    ensurePathExists(path.join(schemaDir, schemaName));
  }

  const evidenceIndex = readJsonFile(indexPath);

  const entries = normalizeIndexEntries(evidenceIndex);
  for (const [evidenceId, files] of entries) {
    if (!Array.isArray(files) || files.some((item) => typeof item !== 'string')) {
      throw new Error(
        `evidence/index.json entry must be string[] for evidence id: ${evidenceId}`,
      );
    }

    if (
      enforceWeeklyEvidenceIds &&
      !/^EVD-WEEKLY20260206-[A-Z]+-[0-9]{3}$/.test(evidenceId)
    ) {
      throw new Error(`Invalid WEEKLY20260206 evidence id: ${evidenceId}`);
    }
  }

  return {
    entries: entries.length,
  };
}

export function verifyBundleDirectory(bundleDir) {
  const requiredBundleFiles = ['report.json', 'metrics.json', 'stamp.json'];

  ensurePathExists(bundleDir);

  for (const requiredFile of requiredBundleFiles) {
    ensurePathExists(path.join(bundleDir, requiredFile));
  }

  const filesToScan = fs
    .readdirSync(bundleDir)
    .filter((fileName) => fileName.endsWith('.json') && fileName !== 'stamp.json');

  for (const fileName of filesToScan) {
    const content = fs.readFileSync(path.join(bundleDir, fileName), 'utf-8');
    if (RFC3339_PATTERN.test(content)) {
      throw new Error(
        `Found RFC3339 timestamp in ${fileName}; only stamp.json may include timestamps`,
      );
    }
  }

  readJsonFile(path.join(bundleDir, 'stamp.json'));

  return {
    filesScanned: filesToScan.length + 1,
  };
}

export function runCli(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const structureResult = verifyEvidenceStructure({
    evidenceDir: options.evidenceDir,
    enforceWeeklyEvidenceIds: options.enforceWeeklyEvidenceIds,
  });

  let bundleResult = null;
  if (options.bundleDir) {
    bundleResult = verifyBundleDirectory(options.bundleDir);
  }

  console.log(
    `evidence-verify: OK (structure entries=${structureResult.entries}${
      bundleResult ? `, bundle files=${bundleResult.filesScanned}` : ''
    })`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli();
}
