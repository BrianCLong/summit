import { readFileSync } from 'node:fs';

export function archiveFromFixture(fixturePath: string): Record<string, unknown> {
  return JSON.parse(readFileSync(fixturePath, 'utf8')) as Record<string, unknown>;
}
