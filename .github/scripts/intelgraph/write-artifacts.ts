import fs from 'node:fs';
import path from 'node:path';

function deterministicStringify(obj: any): string {
  const allKeys: string[] = [];
  JSON.stringify(obj, (key, value) => {
    allKeys.push(key);
    return value;
  });

  allKeys.sort();

  return JSON.stringify(obj, allKeys, 2) + '\n';
}

export function writeDeterministicArtifacts(
  baseDir: string,
  report: any,
  metrics: any,
  stamp: any
): void {
  // Ensure directory exists
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }

  // Remove timestamps from stamp if any snuck in
  const safeStamp = { ...stamp };
  const disallowed = ['createdAtIso', 'createdAt', 'updatedAt', 'timestamp'];
  for (const field of disallowed) {
    if (field in safeStamp) {
      delete safeStamp[field];
    }
  }

  fs.writeFileSync(
    path.join(baseDir, 'report.json'),
    deterministicStringify(report)
  );

  fs.writeFileSync(
    path.join(baseDir, 'metrics.json'),
    deterministicStringify(metrics)
  );

  fs.writeFileSync(
    path.join(baseDir, 'stamp.json'),
    deterministicStringify(safeStamp)
  );
}
