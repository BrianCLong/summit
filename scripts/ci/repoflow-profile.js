import fs from 'node:fs';
import path from 'node:path';

const MAX_ARTIFACT_BYTES = 5 * 1024 * 1024;

const main = () => {
  const root = path.join(process.cwd(), 'artifacts', 'evidence');
  if (!fs.existsSync(root)) {
    throw new Error('Evidence directory not found');
  }
  const entries = fs.readdirSync(root, { withFileTypes: true });
  const evidenceDirs = entries.filter((entry) => entry.isDirectory());
  if (evidenceDirs.length === 0) {
    throw new Error('No evidence directories found');
  }

  for (const entry of evidenceDirs) {
    const dir = path.join(root, entry.name);
    const files = fs.readdirSync(dir);
    let totalBytes = 0;
    for (const file of files) {
      const stat = fs.statSync(path.join(dir, file));
      totalBytes += stat.size;
    }
    if (totalBytes > MAX_ARTIFACT_BYTES) {
      throw new Error(`Evidence artifacts too large in ${entry.name}`);
    }
  }
};

try {
  main();
} catch (error) {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
}
