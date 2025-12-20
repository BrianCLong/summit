#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

/** @typedef {{name: string, from: string, to: string}} FreezeWindow */
/** @typedef {{type: 'holiday' | 'weekend' | 'after-hours', name: string, window?: FreezeWindow}} FreezeReason */
/** @typedef {{now?: Date, timezone?: string, workdayStartHour?: number, workdayEndHour?: number, overrideToken?: string | null}} FreezeCheckOptions */

const DEFAULT_TIMEZONE = process.env.MERGE_TRAIN_TIMEZONE || 'UTC';
const DEFAULT_WORKDAY_START = Number(process.env.MERGE_TRAIN_WORKDAY_START || 8);
const DEFAULT_WORKDAY_END = Number(process.env.MERGE_TRAIN_WORKDAY_END || 18);
const OVERRIDE_TOKEN = process.env.MERGE_TRAIN_OVERRIDE_TOKEN;
const FREEZE_FILE = path.join('.maestro', 'freeze_windows.json');

function readFreezeWindows() {
  if (!fs.existsSync(FREEZE_FILE)) return [];
  const raw = fs.readFileSync(FREEZE_FILE, 'utf8');
  return JSON.parse(raw);
}

function hourAndWeekday(now, timezone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    weekday: 'short',
    hour12: false,
    timeZone: timezone,
  });
  const parts = formatter.formatToParts(now);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon';
  return { hour, weekday };
}

/**
 * @param {string} nowIso
 * @param {FreezeWindow[]} windows
 * @returns {FreezeReason[]}
 */
function activeHolidayWindows(nowIso, windows) {
  return windows
    .filter((w) => nowIso >= w.from && nowIso <= w.to)
    .map((window) => ({ type: 'holiday', name: window.name, window }));
}

/**
 * @param {FreezeCheckOptions} options
 */
export function evaluateFreeze(options = {}) {
  const now = options.now ?? new Date();
  const timezone = options.timezone ?? DEFAULT_TIMEZONE;
  const workdayStartHour = options.workdayStartHour ?? DEFAULT_WORKDAY_START;
  const workdayEndHour = options.workdayEndHour ?? DEFAULT_WORKDAY_END;

  const nowIso = now.toISOString();
  const windows = readFreezeWindows();
  const reasons = [...activeHolidayWindows(nowIso, windows)];
  const { hour, weekday } = hourAndWeekday(now, timezone);

  if (weekday === 'Sat' || weekday === 'Sun') {
    reasons.push({ type: 'weekend', name: 'Weekend freeze' });
  } else if (hour < workdayStartHour || hour >= workdayEndHour) {
    reasons.push({ type: 'after-hours', name: 'After-hours freeze' });
  }

  return { nowIso, timezone, reasons };
}

function parseOverrideToken(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error('Override token must be valid JSON');
  }
}

function evaluateOverrideWithOpa(token, reasons, nowIso) {
  const input = { token, reasons, now: nowIso };
  const result = spawnSync(
    'opa',
    ['eval', '-I', '-f', 'json', '-d', 'policy/', 'data.summit.merge_train'],
    { input: JSON.stringify(input) },
  );

  if (result.error) {
    const errorCode = result.error?.code;
    if (errorCode === 'ENOENT') {
      throw new Error('opa binary not found; install OPA to evaluate override tokens');
    }
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(result.stderr?.toString() || 'OPA evaluation failed');
  }

  const payload = JSON.parse(result.stdout.toString());
  const value = payload.result?.[0]?.expressions?.[0]?.value;
  return {
    allow: Boolean(value?.allow_override),
    denies: value?.denies ?? [],
  };
}

/**
 * @param {FreezeCheckOptions} options
 */
export function guardMergeTrain(options = {}) {
  const { nowIso, reasons } = evaluateFreeze(options);

  if (!reasons.length) {
    return { allowed: true, reasons, overrideApplied: false };
  }

  const token = parseOverrideToken(options.overrideToken ?? OVERRIDE_TOKEN);
  if (!token) {
    return { allowed: false, reasons, overrideApplied: false };
  }

  const decision = evaluateOverrideWithOpa(token, reasons, nowIso);
  return {
    allowed: decision.allow,
    reasons,
    overrideApplied: decision.allow,
    denies: decision.denies,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const result = guardMergeTrain();
    if (result.allowed) {
      if (result.overrideApplied) {
        console.log('✅ merge train allowed via approved override token');
      } else {
        console.log('✅ merge train allowed (no active freeze windows)');
      }
      process.exit(0);
    }

    const reasonSummary = result.reasons
      .map((r) => (r.window ? `${r.name} (${r.window.from} → ${r.window.to})` : r.name))
      .join('; ');

    if (result.denies?.length) {
      console.error(`❌ merge train blocked: ${reasonSummary}`);
      console.error(`OPA denied override: ${result.denies.join('; ')}`);
    } else {
      console.error(`❌ merge train blocked: ${reasonSummary}`);
      console.error('Set MERGE_TRAIN_OVERRIDE_TOKEN with an approved payload to proceed.');
    }
    process.exit(1);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    console.error(`❌ merge train freeze check failed: ${message}`);
    process.exit(1);
  }
}
