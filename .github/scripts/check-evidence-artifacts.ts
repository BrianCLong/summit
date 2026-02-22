import { promises as fs } from 'node:fs';
import path from 'node:path';

const requiredFiles = ['report.json', 'metrics.json', 'stamp.json'];
const requiredReportFields = [
  'evidenceId',
  'repo.url',
  'repo.ref',
  'changes.filesTouched',
  'sandbox.profile',
  'sandbox.exitCode',
  'policy.decision',
  'policy.policyHash',
];

const getField = (obj: Record<string, unknown>, key: string): unknown =>
  key.split('.').reduce<unknown>((acc, segment) => {
    if (acc && typeof acc === 'object' && segment in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[segment];
    }
    return undefined;
  }, obj);

const main = async () => {
  const evidenceRoot = path.join(process.cwd(), 'artifacts', 'evidence');
  const entries = await fs.readdir(evidenceRoot, { withFileTypes: true });
  const evidenceDirs = entries.filter((entry) => entry.isDirectory());

  if (evidenceDirs.length === 0) {
    throw new Error('No evidence directories found');
  }

  for (const entry of evidenceDirs) {
    const dir = path.join(evidenceRoot, entry.name);
    for (const file of requiredFiles) {
      const filePath = path.join(dir, file);
      await fs.access(filePath);
    }
    const report = JSON.parse(
      await fs.readFile(path.join(dir, 'report.json'), 'utf8'),
    ) as Record<string, unknown>;
    const missing = requiredReportFields.filter((field) => {
      const value = getField(report, field);
      return value === undefined || value === null || value === '';
    });
    if (missing.length > 0) {
      throw new Error(`Missing evidence fields in ${entry.name}: ${missing.join(', ')}`);
    }
  }
};

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
