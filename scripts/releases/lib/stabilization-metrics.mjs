import { readFile, access } from 'node:fs/promises';
import path from 'node:path';

export const METRIC_FIELDS = [
  'risk_index',
  'done_p0',
  'done_p1',
  'on_time_rate',
  'overdue_load',
  'overdue_load_p0',
  'evidence_compliance',
  'issuance_completeness',
  'blocked_unissued',
];

export const METRIC_PREFER_HIGHER = new Set([
  'done_p0',
  'done_p1',
  'on_time_rate',
  'evidence_compliance',
  'issuance_completeness',
]);

export async function readJsonIfPresent(filePath) {
  try {
    await access(filePath);
  } catch {
    return null;
  }
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

export function formatNumber(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'n/a';
  }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? `${value}` : value.toFixed(digits);
  }
  return `${value}`;
}

export function formatPercentage(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'n/a';
  }
  return `${(value * 100).toFixed(1)}%`;
}

export function normalizeWeekEnding(entry, fallbackLabel) {
  return (
    entry?.week_ending ||
    entry?.weekEnding ||
    entry?.week ||
    fallbackLabel ||
    'Deferred pending week label'
  );
}

export function extractMetrics({ scorecard, escalation }) {
  return {
    risk_index: scorecard?.risk_index ?? null,
    done_p0: scorecard?.done_p0 ?? null,
    done_p1: scorecard?.done_p1 ?? null,
    on_time_rate: scorecard?.on_time_rate ?? null,
    overdue_load: scorecard?.overdue_load ?? null,
    overdue_load_p0: scorecard?.overdue_load_p0 ?? null,
    evidence_compliance: scorecard?.evidence_compliance ?? null,
    issuance_completeness: scorecard?.issuance_completeness ?? null,
    blocked_unissued: escalation?.blocked_unissued ?? null,
  };
}

export function summarizeOffenders(overdueItems) {
  const itemMap = new Map();
  const areaMap = new Map();
  const ownerMap = new Map();

  overdueItems.forEach((item) => {
    const key = item.id || item.key || item.title || 'Deferred pending item id';
    const area = item.area || item.component || 'Deferred pending area';
    const owner = item.owner || item.team || 'Deferred pending owner';

    const itemRecord = itemMap.get(key) || {
      id: key,
      area,
      owner,
      weeks: new Set(),
    };
    itemRecord.area = area;
    itemRecord.owner = owner;
    itemRecord.weeks.add(item.week_ending || item.weekEnding || item.week || 'unknown');
    itemMap.set(key, itemRecord);

    if (area) {
      areaMap.set(area, (areaMap.get(area) || 0) + 1);
    }
    if (owner) {
      ownerMap.set(owner, (ownerMap.get(owner) || 0) + 1);
    }
  });

  const items = Array.from(itemMap.values()).map((record) => ({
    ...record,
    weeks: record.weeks.size,
  }));
  items.sort((a, b) => b.weeks - a.weeks || a.id.localeCompare(b.id));

  const areas = Array.from(areaMap.entries())
    .map(([area, count]) => ({ area, count }))
    .sort((a, b) => b.count - a.count || a.area.localeCompare(b.area));

  const owners = Array.from(ownerMap.entries())
    .map(([owner, count]) => ({ owner, count }))
    .sort((a, b) => b.count - a.count || a.owner.localeCompare(b.owner));

  return { items, areas, owners };
}

export function average(values) {
  const filtered = values.filter((value) => typeof value === 'number');
  if (!filtered.length) {
    return null;
  }
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
}

export function resolveArtifactPaths(baseDir) {
  return {
    scorecard: path.join(baseDir, 'scorecard.json'),
    escalation: path.join(baseDir, 'escalation.json'),
    diff: path.join(baseDir, 'diff.json'),
  };
}
