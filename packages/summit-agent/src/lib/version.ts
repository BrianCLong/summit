import { readFileSync } from 'fs';

export function getPackageVersion(): string {
  const packageJsonUrl = new URL('../../package.json', import.meta.url);
  const contents = readFileSync(packageJsonUrl, 'utf8');
  const parsed = JSON.parse(contents) as { version?: string };
  return parsed.version ?? '0.0.0';
}
