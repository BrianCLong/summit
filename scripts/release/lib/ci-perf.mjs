import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

export const DEFAULT_OVERRIDES_MAX_DAYS = 14;

export function loadYamlFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return yaml.load(raw);
}

export function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function formatIso(date) {
  return new Date(date).toISOString();
}

export function buildUnitId({ workflow_file, job, step_group }) {
  return [workflow_file, job, step_group].filter(Boolean).join('::');
}

export function percentile(values, pct) {
  if (!values.length) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((pct / 100) * sorted.length) - 1;
  return sorted[Math.min(Math.max(index, 0), sorted.length - 1)];
}

export function mean(values) {
  if (!values.length) {
    return null;
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

export function filterByWindow(entries, windowDays, now = new Date()) {
  const cutoff = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
  return entries.filter((entry) => new Date(entry.completed_at) >= cutoff);
}

export function summarizeEntries(entries, windows = [7, 30], now = new Date()) {
  const byUnit = new Map();
  for (const entry of entries) {
    const unitId = entry.unit_id;
    if (!byUnit.has(unitId)) {
      byUnit.set(unitId, []);
    }
    byUnit.get(unitId).push(entry);
  }

  const summaries = [];
  for (const [unitId, unitEntries] of byUnit.entries()) {
    const sample = unitEntries[0];
    const summary = {
      unit_id: unitId,
      workflow_file: sample.workflow_file,
      job_name: sample.job_name,
      unit_type: sample.unit_type,
      windows: {},
    };

    for (const window of windows) {
      const scoped = filterByWindow(unitEntries, window, now);
      const durations = scoped.map((entry) => entry.duration_seconds);
      summary.windows[`${window}d`] = {
        count: durations.length,
        p50_seconds: percentile(durations, 50),
        p95_seconds: percentile(durations, 95),
        mean_seconds: mean(durations),
      };
    }

    summaries.push(summary);
  }

  return summaries;
}

export function durationSeconds(startedAt, completedAt) {
  const start = Date.parse(startedAt);
  const end = Date.parse(completedAt);
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return null;
  }
  return Math.max(0, Math.round((end - start) / 1000));
}

export function loadBudgetConfig(filePath) {
  const config = loadYamlFile(filePath);
  return config;
}

export function loadOverrides(filePath) {
  const config = loadYamlFile(filePath);
  return config;
}

export function parseOverrideDates(override) {
  return {
    created: new Date(override.created),
    expires: new Date(override.expires),
  };
}

export function validateOverrides(overridesConfig, options = {}) {
  const now = options.now ?? new Date();
  const maxDays = options.maxDays ?? DEFAULT_OVERRIDES_MAX_DAYS;
  const failures = [];
  if (!overridesConfig || overridesConfig.version !== 1) {
    failures.push('Overrides registry must include version: 1.');
    return failures;
  }

  for (const override of overridesConfig.overrides ?? []) {
    const { created, expires } = parseOverrideDates(override);
    if (Number.isNaN(created.getTime()) || Number.isNaN(expires.getTime())) {
      failures.push(`Override ${override.id} has invalid created/expires timestamps.`);
      continue;
    }
    if (expires <= now) {
      failures.push(`Override ${override.id} has expired.`);
    }
    const deltaDays = (expires - created) / (24 * 60 * 60 * 1000);
    if (deltaDays > maxDays) {
      failures.push(`Override ${override.id} exceeds max duration of ${maxDays} days.`);
    }
    if (override.target?.workflow_file?.includes('*') || override.target?.job?.includes('*')) {
      failures.push(`Override ${override.id} target is overly broad.`);
    }
  }

  return failures;
}

export function matchOverride(overridesConfig, budget) {
  const overrides = overridesConfig?.overrides ?? [];
  return overrides.find((override) => {
    if (override.target?.workflow_file !== budget.workflow_file) {
      return false;
    }
    if (override.target?.job !== budget.job) {
      return false;
    }
    if (override.target?.step_group && override.target.step_group !== budget.step_group) {
      return false;
    }
    const { expires } = parseOverrideDates(override);
    return expires > new Date();
  });
}

export function computeOveragePercent(value, reference) {
  if (reference === 0 || reference === null || reference === undefined) {
    return null;
  }
  return ((value - reference) / reference) * 100;
}

export function regressionTriggered(currentValue, baselineValue, thresholdPercent) {
  if (baselineValue === null || baselineValue === undefined) {
    return false;
  }
  const limit = baselineValue * (1 + thresholdPercent / 100);
  return currentValue > limit;
}

export function buildSummaryTable(items) {
  return items
    .map((item) => ({
      unit_id: item.unit_id,
      workflow_file: item.workflow_file,
      job_name: item.job_name,
      unit_type: item.unit_type,
      duration_seconds: item.duration_seconds,
    }))
    .sort((a, b) => b.duration_seconds - a.duration_seconds);
}
