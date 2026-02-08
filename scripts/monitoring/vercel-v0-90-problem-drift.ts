import { promises as fs } from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const getGitSha = async () => {
  const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD']);
  return stdout.toString().trim();
};

const stableStringify = (value: Record<string, unknown>) =>
  `${JSON.stringify(value, Object.keys(value).sort(), 2)}\n`;

const main = async () => {
  const sha = await getGitSha();
  const root = path.join(
    process.cwd(),
    'artifacts',
    'monitoring',
    'vercel-v0-90-problem',
  );
  const filePath = path.join(root, 'trend.json');
  await fs.mkdir(root, { recursive: true });

  let existing: Record<string, number> = {};
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    existing = JSON.parse(raw) as Record<string, number>;
  } catch {
    existing = {};
  }

  const updated = {
    ...existing,
    [sha]: (existing[sha] ?? 0) + 1,
  };

  await fs.writeFile(filePath, stableStringify(updated), 'utf8');
};

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
