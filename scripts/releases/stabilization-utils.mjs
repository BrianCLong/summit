#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import yaml from 'js-yaml';

const DEFAULT_POLICY_PATH = 'docs/ci/STABILIZATION_RETROSPECTIVE_POLICY.yml';

const DEFAULT_POLICY = {
  stabilization_retrospective: {
    weeks_default: 4,
    window: {
      week_ending_day: 'FRI',
    },
    closeout_sources: {
      local_dir: 'artifacts/stabilization/weekly-closeout',
      artifact_name_patterns: {
        scorecard: 'weekly-closeout-scorecard',
        escalation: 'weekly-closeout-escalation',
        diff: 'weekly-closeout-diff',
      },
      expected_files: {
        scorecard: 'scorecard.json',
        escalation: 'escalation.json',
        diff: 'diff.json',
      },
      max_artifacts: 80,
    },
    focus_themes: {
      max: 5,
      thresholds: {
        evidence_compliance_min: 0.95,
        risk_index_increase: 5,
        overdue_load_min: 1,
        blocked_unissued_min: 1,
        on_time_rate_min: 0.9,
      },
    },
  },
  stabilization_roadmap_handoff: {
    enabled: true,
    mode: 'draft',
    max_candidates: 5,
    thresholds: {
      recurring_overdue_weeks: 2,
      min_risk_index_avg: 30,
      evidence_compliance_min: 0.95,
      blocked_unissued_p0_min: 1,
      overdue_load_p0_min: 1,
    },
    labels: {
      base: ['roadmap', 'stabilization'],
      triage: ['needs-triage'],
    },
  },
};

export async function loadPolicy(policyPath = DEFAULT_POLICY_PATH) {
  try {
    const raw = await fs.readFile(policyPath, 'utf8');
    const parsed = yaml.load(raw);
    if (!parsed || typeof parsed !== 'object') {
      return DEFAULT_POLICY;
    }
    return {
      ...DEFAULT_POLICY,
      ...parsed,
      stabilization_retrospective: {
        ...DEFAULT_POLICY.stabilization_retrospective,
        ...(parsed.stabilization_retrospective || {}),
      },
      stabilization_roadmap_handoff: {
        ...DEFAULT_POLICY.stabilization_roadmap_handoff,
        ...(parsed.stabilization_roadmap_handoff || {}),
      },
    };
  } catch (error) {
    return DEFAULT_POLICY;
  }
}

export function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const entry = argv[i];
    if (!entry.startsWith('--')) {
      continue;
    }
    const [key, inlineValue] = entry.replace(/^--/, '').split('=');
    if (inlineValue !== undefined) {
      args[key] = inlineValue;
      continue;
    }
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      args[key] = next;
      i += 1;
    } else {
      args[key] = true;
    }
  }
  return args;
}

export function resolveRepo() {
  if (process.env.GITHUB_REPOSITORY) {
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
    return { owner, repo };
  }
  try {
    const remote = execFileSync('git', ['config', '--get', 'remote.origin.url'], {
      encoding: 'utf8',
    }).trim();
    const match = remote.match(/[:/]([^/]+)\/([^/]+?)(\.git)?$/);
    if (match) {
      return { owner: match[1], repo: match[2] };
    }
  } catch (error) {
    return { owner: 'unknown', repo: 'unknown' };
  }
  return { owner: 'unknown', repo: 'unknown' };
}

export async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function writeJson(filePath, data) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

export async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

export function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'n/a';
  }
  if (typeof value === 'number') {
    return `${value}`;
  }
  return `${value}`;
}

export function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'n/a';
  }
  const pct = typeof value === 'number' ? value * 100 : Number(value) * 100;
  if (Number.isNaN(pct)) {
    return 'n/a';
  }
  return `${pct.toFixed(1)}%`;
}

export function hashContent(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function normalizeWeekEnding(dateValue, weekEndingDay = 'FRI') {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const target = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].indexOf(
    weekEndingDay.toUpperCase(),
  );
  const targetDay = target >= 0 ? target : 5;
  const current = date.getUTCDay();
  const delta = (targetDay - current + 7) % 7;
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  end.setUTCDate(end.getUTCDate() + delta);
  return end.toISOString().slice(0, 10);
}

export async function listLocalCloseoutArtifacts(localDir, expectedFiles) {
  const entries = await fs.readdir(localDir, { withFileTypes: true });
  const weeks = new Map();

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const weekKey = entry.name;
      const weekDir = path.join(localDir, entry.name);
      const files = await fs.readdir(weekDir);
      for (const [type, filename] of Object.entries(expectedFiles)) {
        if (files.includes(filename)) {
          weeks.set(weekKey, {
            ...(weeks.get(weekKey) || {}),
            [type]: path.join(weekDir, filename),
          });
        }
      }
    }
  }

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    const match = entry.name.match(/(scorecard|escalation|diff).*?(\d{4}-\d{2}-\d{2})/i);
    if (!match) {
      continue;
    }
    const type = match[1].toLowerCase();
    const weekKey = match[2];
    weeks.set(weekKey, {
      ...(weeks.get(weekKey) || {}),
      [type]: path.join(localDir, entry.name),
    });
  }

  return weeks;
}

export function parseMetric(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number') {
    return value;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function getValueByPath(obj, paths) {
  for (const pathEntry of paths) {
    const segments = pathEntry.split('.');
    let current = obj;
    let found = true;
    for (const segment of segments) {
      if (!current || typeof current !== 'object' || !(segment in current)) {
        found = false;
        break;
      }
      current = current[segment];
    }
    if (found) {
      return current;
    }
  }
  return null;
}

export function extractOverdueItems(data) {
  if (!data || typeof data !== 'object') {
    return [];
  }
  const candidates = [
    data.overdue_items,
    data.overdue,
    data.blockers,
    data.items,
    getValueByPath(data, ['metrics.overdue_items', 'summary.overdue_items']),
  ];
  for (const list of candidates) {
    if (Array.isArray(list)) {
      return list
        .map((item) => {
          if (!item || typeof item !== 'object') {
            return null;
          }
          return {
            id: item.id || item.key || item.ticket || item.issue || item.ref,
            area: item.area || item.domain || item.team,
            owner: item.owner || item.assignee,
          };
        })
        .filter(Boolean);
    }
  }
  return [];
}

export function extractMetricBlock(data, fieldPaths) {
  return parseMetric(getValueByPath(data, fieldPaths));
}

export function toSlug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function uniqueBy(array, keyFn) {
  const seen = new Set();
  const output = [];
  for (const entry of array) {
    const key = keyFn(entry);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(entry);
  }
  return output;
}

export function selectTop(items, limit, compareFn) {
  return [...items].sort(compareFn).slice(0, limit);
}

export function resolveTimestamp(input) {
  if (input) {
    return input;
  }
  if (process.env.RETRO_TIMESTAMP) {
    return process.env.RETRO_TIMESTAMP;
  }
  if (process.env.GITHUB_RUN_ID) {
    return `${process.env.GITHUB_RUN_ID}`;
  }
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export function commandExists(command) {
  try {
    execFileSync(command, ['--version'], { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

export function runCommand(command, args, options = {}) {
  return execFileSync(command, args, { encoding: 'utf8', ...options });
}
