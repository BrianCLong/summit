import fs from 'node:fs';
import path from 'node:path';

type EvidenceFiles = {
  report: string;
  metrics: string;
  stamp: string;
};

type EvidenceEntry = {
  evidence_id: string;
  files: EvidenceFiles;
};

type EvidenceIndex = {
  version: number;
  items: EvidenceEntry[];
};

type Options = {
  indexPath: string;
  rootDir: string;
};

const TIMESTAMP_REGEX = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

const DEFAULT_INDEX_PATH = 'evidence/index.json';
const DEFAULT_ROOT_DIR = '.';

function parseArgs(argv: string[]): Options {
  const options: Options = {
    indexPath: DEFAULT_INDEX_PATH,
    rootDir: DEFAULT_ROOT_DIR,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--index') {
      options.indexPath = argv[i + 1] ?? DEFAULT_INDEX_PATH;
      i += 1;
    } else if (arg === '--root') {
      options.rootDir = argv[i + 1] ?? DEFAULT_ROOT_DIR;
      i += 1;
    }
  }

  return options;
}

function mustExist(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required file: ${filePath}`);
  }
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function assertIndex(index: EvidenceIndex): void {
  if (!Array.isArray(index.items) || index.items.length === 0) {
    throw new Error('evidence/index.json must include items[]');
  }
}

function resolveFile(rootDir: string, filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : path.join(rootDir, filePath);
}

function verifyReport(reportPath: string): void {
  const reportContents = fs.readFileSync(reportPath, 'utf8');
  if (TIMESTAMP_REGEX.test(reportContents)) {
    throw new Error(
      `Timestamp-like strings found in report.json: ${reportPath}`,
    );
  }
}

function verifyEntry(entry: EvidenceEntry, rootDir: string): void {
  if (!entry.evidence_id) {
    throw new Error('Evidence entry missing evidence_id');
  }

  const filePaths = [
    entry.files.report,
    entry.files.metrics,
    entry.files.stamp,
  ];

  filePaths.forEach((filePath) => {
    const resolvedPath = resolveFile(rootDir, filePath);
    mustExist(resolvedPath);
  });

  verifyReport(resolveFile(rootDir, entry.files.report));
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const indexPath = resolveFile(options.rootDir, options.indexPath);

  mustExist(indexPath);
  const index = readJson<EvidenceIndex>(indexPath);
  assertIndex(index);

  index.items.forEach((entry) => verifyEntry(entry, options.rootDir));
}

main();
