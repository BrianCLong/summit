import fs from 'fs';
import path from 'path';
import { deterministicNormalize } from './normalizers.js';

const UPDATE_FLAG = process.env.UPDATE_GOLDENS === '1';

export function resolveSnapshotPath(relativePath: string): string {
  return path.join(process.cwd(), 'tests', 'golden', relativePath);
}

export function loadSnapshot<T = unknown>(relativePath: string): T {
  const fullPath = resolveSnapshotPath(relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Golden snapshot missing: ${fullPath}`);
  }
  const raw = fs.readFileSync(fullPath, 'utf8');
  return JSON.parse(raw) as T;
}

export function saveSnapshot(relativePath: string, payload: unknown): void {
  const fullPath = resolveSnapshotPath(relativePath);
  const normalized = deterministicNormalize(payload);

  if (!UPDATE_FLAG && fs.existsSync(fullPath)) {
    return;
  }

  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fullPath, JSON.stringify(normalized, null, 2));
}

export function assertMatchesGolden(
  relativePath: string,
  received: unknown,
): void {
  const normalized = deterministicNormalize(received);
  if (UPDATE_FLAG) {
    saveSnapshot(relativePath, normalized);
  }
  const expected = loadSnapshot(relativePath);
  expect(normalized).toEqual(expected);
}
