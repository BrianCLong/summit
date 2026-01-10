#!/usr/bin/env npx tsx
import { promises as fs } from 'fs';
import path from 'path';

export type SemverLevel = 'patch' | 'minor' | 'major';
export type SemverLabel = 'semver:patch' | 'semver:minor' | 'semver:major';

const SEMVER_LABEL_MAP: Record<SemverLabel, SemverLevel> = {
  'semver:patch': 'patch',
  'semver:minor': 'minor',
  'semver:major': 'major',
};

interface CheckOptions {
  fixturePath?: string;
  warnOnly?: boolean;
  outputPath?: string;
  strict?: boolean;
}

export interface CheckReport {
  source: 'fixture' | 'event' | 'env' | 'manual';
  labels: string[];
  status: 'pass' | 'warn' | 'fail';
  label: SemverLabel | null;
  bump: SemverLevel | null;
  warnings: string[];
  errors: string[];
}

export function mapLabelToLevel(label: string): SemverLevel | null {
  const normalized = label.trim().toLowerCase();
  return SEMVER_LABEL_MAP[normalized as SemverLabel] ?? null;
}

export function extractLabelNames(input: unknown): string[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    if (input.every((item) => typeof item === 'string')) {
      return input as string[];
    }
    if (input.every((item) => typeof item === 'object' && item && 'name' in item)) {
      return (input as Array<{ name: string }>).map((item) => item.name);
    }
  }
  if (typeof input === 'object' && 'labels' in (input as Record<string, unknown>)) {
    return extractLabelNames((input as { labels: unknown }).labels);
  }
  return [];
}

export function evaluateLabels(labels: string[]): CheckReport {
  const normalized = labels.map((label) => label.trim()).filter(Boolean);
  const semverLabels = normalized
    .map((label) => ({
      raw: label,
      normalized: label.trim().toLowerCase(),
      bump: mapLabelToLevel(label),
    }))
    .filter((entry) => entry.bump);
  const uniqueSemverLabels = new Map<string, { label: SemverLabel; bump: SemverLevel }>();
  for (const entry of semverLabels) {
    const canonical = entry.normalized as SemverLabel;
    if (!uniqueSemverLabels.has(canonical)) {
      uniqueSemverLabels.set(canonical, { label: canonical, bump: entry.bump as SemverLevel });
    }
  }
  const distinctSemverLabels = Array.from(uniqueSemverLabels.values());

  const warnings: string[] = [];
  const errors: string[] = [];

  if (distinctSemverLabels.length === 0) {
    warnings.push('No semver label detected. Add one of semver:patch, semver:minor, semver:major.');
  }

  if (distinctSemverLabels.length > 1) {
    errors.push('Multiple semver labels detected; use exactly one.');
  }

  const selected = distinctSemverLabels[0] ?? null;
  const status: CheckReport['status'] = errors.length > 0 ? 'fail' : warnings.length > 0 ? 'warn' : 'pass';

  return {
    source: 'manual',
    labels: normalized,
    status,
    label: selected?.label ?? null,
    bump: selected?.bump ?? null,
    warnings,
    errors,
  };
}

async function loadLabelsFromFixture(fixturePath: string): Promise<{ labels: string[]; source: CheckReport['source'] }> {
  const resolved = path.resolve(process.cwd(), fixturePath);
  const contents = await fs.readFile(resolved, 'utf8');
  const parsed = JSON.parse(contents);
  return { labels: extractLabelNames(parsed), source: 'fixture' };
}

async function loadLabelsFromEventPayload(): Promise<{ labels: string[]; source: CheckReport['source'] }> {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (eventPath && (await exists(eventPath))) {
    const contents = await fs.readFile(eventPath, 'utf8');
    const parsed = JSON.parse(contents);
    const labels = extractLabelNames(parsed.pull_request?.labels ?? parsed.labels ?? []);
    return { labels, source: 'event' };
  }
  if (process.env.PR_LABELS) {
    const labels = process.env.PR_LABELS.split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    return { labels, source: 'env' };
  }
  return { labels: [], source: 'manual' };
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function run(options: CheckOptions): Promise<{ report: CheckReport; exitCode: number }> {
  const { fixturePath, warnOnly = false, outputPath, strict = false } = options;
  const sourceLabels = fixturePath ? await loadLabelsFromFixture(fixturePath) : await loadLabelsFromEventPayload();
  const report = evaluateLabels(sourceLabels.labels);
  report.source = sourceLabels.source;

  if (outputPath) {
    const resolved = path.resolve(process.cwd(), outputPath);
    await fs.writeFile(resolved, JSON.stringify(report, null, 2));
  }

  const exitCode = warnOnly ? 0 : strict ? (report.status === 'pass' ? 0 : 1) : report.status === 'fail' ? 1 : 0;
  return { report, exitCode };
}

function printReport(report: CheckReport): void {
  const heading = report.status === 'pass' ? 'Semver label check passed' : 'Semver label check findings';
  console.log(heading);
  console.log(JSON.stringify(report, null, 2));
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const fixtureIndex = argv.indexOf('--fixture');
  const outputIndex = argv.indexOf('--output');
  const warnOnly = argv.includes('--warn-only');
  const strict = argv.includes('--strict');

  const fixturePath = fixtureIndex >= 0 ? argv[fixtureIndex + 1] : undefined;
  const outputPath = outputIndex >= 0 ? argv[outputIndex + 1] : undefined;

  const { report, exitCode } = await run({ fixturePath, warnOnly, outputPath, strict });
  printReport(report);

  process.exit(exitCode);
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch((error) => {
    console.error('Unexpected error while checking semver labels', error);
    process.exit(1);
  });
}
