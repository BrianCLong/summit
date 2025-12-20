import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Captures a golden dataset (artifacts) for a run.
 * Saves the artifacts and their SHA256 hash to a file.
 *
 * @param runId - The ID of the run.
 * @param artifacts - The artifacts to capture.
 * @param dir - The directory to save the golden file (default: 'goldens').
 * @returns An object containing the file path and SHA hash.
 */
export async function captureGolden(
  runId: string,
  artifacts: Record<string, any>,
  dir = 'goldens',
) {
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `${runId}.json`);
  const payload = JSON.stringify(artifacts, Object.keys(artifacts).sort());
  const sha = crypto.createHash('sha256').update(payload).digest('hex');
  await fs.writeFile(file, JSON.stringify({ sha, artifacts }, null, 2));
  return { file, sha };
}

/**
 * Compares the actual artifacts of a run against a stored golden dataset.
 * Supports numeric tolerances for fuzzy comparison.
 *
 * @param runId - The ID of the run.
 * @param actual - The actual artifacts to compare.
 * @param dir - The directory containing the golden file (default: 'goldens').
 * @param tolerances - A map of property names to numeric tolerance values.
 * @returns An object indicating success (ok) and a list of differences (diffs).
 */
export async function compareToGolden(
  runId: string,
  actual: Record<string, any>,
  dir = 'goldens',
  tolerances?: Record<string, number>,
) {
  const file = path.join(dir, `${runId}.json`);
  const baseline = JSON.parse(await fs.readFile(file, 'utf8'));
  const diffs: string[] = [];
  function cmp(a: any, b: any, p = '') {
    if (typeof a === 'number' && typeof b === 'number') {
      const key = p.split('.').pop() || '';
      const tol = (tolerances && tolerances[key]) || 0;
      if (Math.abs(a - b) > tol)
        diffs.push(`${p}: ${a} vs ${b} (> tol ${tol})`);
      return;
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length)
        diffs.push(`${p}: len ${a.length} vs ${b.length}`);
      a.forEach((v, i) => cmp(v, b[i], `${p}[${i}]`));
      return;
    }
    if (a && b && typeof a === 'object' && typeof b === 'object') {
      const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
      for (const k of keys) cmp(a[k], b[k], p ? `${p}.${k}` : k);
      return;
    }
    if (a !== b) diffs.push(`${p}: ${a} vs ${b}`);
  }
  cmp(actual, baseline.artifacts, '');
  return { ok: diffs.length === 0, diffs };
}
