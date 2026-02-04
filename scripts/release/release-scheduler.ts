#!/usr/bin/env npx tsx
/**
 * Release Scheduler
 *
 * Schedules releases for specific times:
 * - Schedule future releases
 * - View scheduled releases
 * - Cancel/reschedule releases
 * - Automatic execution via cron
 *
 * Usage:
 *   npx tsx scripts/release/release-scheduler.ts schedule <version> --at <datetime>
 *   npx tsx scripts/release/release-scheduler.ts list
 *   npx tsx scripts/release/release-scheduler.ts cancel <id>
 *
 * Options:
 *   --at <datetime>    Schedule time (ISO format or relative: "tomorrow 2pm")
 *   --env <name>       Target environment
 *   --notify           Send notification when release starts
 *   --dry-run          Schedule without executing
 */

import { spawnSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';

interface ScheduledRelease {
  id: string;
  version: string;
  scheduledAt: string;
  scheduledBy: string;
  createdAt: string;
  environment: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  notify: boolean;
  dryRun: boolean;
  result?: {
    startedAt: string;
    completedAt?: string;
    success: boolean;
    output?: string;
    error?: string;
  };
}

const SCHEDULE_FILE = '.release-schedule.json';

function run(cmd: string, args: string[]): { success: boolean; output: string; stderr: string } {
  const result = spawnSync(cmd, args, { encoding: 'utf8', stdio: 'pipe' });
  return {
    success: result.status === 0,
    output: result.stdout?.trim() ?? '',
    stderr: result.stderr?.trim() ?? '',
  };
}

function getUser(): string {
  const gitUser = run('git', ['config', 'user.name']);
  return gitUser.success ? gitUser.output : os.userInfo().username;
}

function generateId(): string {
  return crypto.randomBytes(4).toString('hex');
}

function parseDateTime(input: string): Date {
  // Handle relative dates
  const lowerInput = input.toLowerCase();

  if (lowerInput === 'now') {
    return new Date();
  }

  // "tomorrow 2pm", "tomorrow 14:00"
  const tomorrowMatch = lowerInput.match(/tomorrow\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (tomorrowMatch) {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    let hours = parseInt(tomorrowMatch[1], 10);
    const minutes = parseInt(tomorrowMatch[2] || '0', 10);
    const ampm = tomorrowMatch[3]?.toLowerCase();

    if (ampm === 'pm' && hours < 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;

    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  // "in 2 hours", "in 30 minutes"
  const relativeMatch = lowerInput.match(/in\s+(\d+)\s*(hour|minute|min|hr)s?/i);
  if (relativeMatch) {
    const amount = parseInt(relativeMatch[1], 10);
    const unit = relativeMatch[2].toLowerCase();
    const date = new Date();

    if (unit.startsWith('hour') || unit === 'hr') {
      date.setHours(date.getHours() + amount);
    } else {
      date.setMinutes(date.getMinutes() + amount);
    }
    return date;
  }

  // "next monday 9am"
  const dayMatch = lowerInput.match(/next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (dayMatch) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDay = days.indexOf(dayMatch[1].toLowerCase());
    const date = new Date();
    const currentDay = date.getDay();

    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0) daysUntil += 7;

    date.setDate(date.getDate() + daysUntil);

    let hours = parseInt(dayMatch[2], 10);
    const minutes = parseInt(dayMatch[3] || '0', 10);
    const ampm = dayMatch[4]?.toLowerCase();

    if (ampm === 'pm' && hours < 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;

    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  // Try ISO format
  const isoDate = new Date(input);
  if (!isNaN(isoDate.getTime())) {
    return isoDate;
  }

  throw new Error(`Cannot parse date: ${input}`);
}

function readSchedule(): ScheduledRelease[] {
  const filePath = path.join(process.cwd(), SCHEDULE_FILE);
  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return [];
  }
}

function writeSchedule(releases: ScheduledRelease[]): void {
  const filePath = path.join(process.cwd(), SCHEDULE_FILE);
  fs.writeFileSync(filePath, JSON.stringify(releases, null, 2) + '\n');
}

function scheduleRelease(
  version: string,
  scheduledAt: Date,
  environment: string,
  notify: boolean,
  dryRun: boolean
): ScheduledRelease {
  const releases = readSchedule();

  // Check for conflicts
  const conflicting = releases.find(r =>
    r.status === 'pending' &&
    Math.abs(new Date(r.scheduledAt).getTime() - scheduledAt.getTime()) < 30 * 60 * 1000 // 30 min window
  );

  if (conflicting) {
    console.log(`\n[WARN] Another release (${conflicting.version}) is scheduled within 30 minutes`);
  }

  const release: ScheduledRelease = {
    id: generateId(),
    version,
    scheduledAt: scheduledAt.toISOString(),
    scheduledBy: getUser(),
    createdAt: new Date().toISOString(),
    environment,
    status: 'pending',
    notify,
    dryRun,
  };

  releases.push(release);
  writeSchedule(releases);

  return release;
}

function cancelRelease(id: string): boolean {
  const releases = readSchedule();
  const idx = releases.findIndex(r => r.id === id);

  if (idx === -1) {
    console.error(`Release not found: ${id}`);
    return false;
  }

  if (releases[idx].status !== 'pending') {
    console.error(`Cannot cancel release with status: ${releases[idx].status}`);
    return false;
  }

  releases[idx].status = 'cancelled';
  writeSchedule(releases);

  console.log(`\n Release cancelled: ${releases[idx].version} (${id})`);
  return true;
}

function rescheduleRelease(id: string, newTime: Date): boolean {
  const releases = readSchedule();
  const idx = releases.findIndex(r => r.id === id);

  if (idx === -1) {
    console.error(`Release not found: ${id}`);
    return false;
  }

  if (releases[idx].status !== 'pending') {
    console.error(`Cannot reschedule release with status: ${releases[idx].status}`);
    return false;
  }

  releases[idx].scheduledAt = newTime.toISOString();
  writeSchedule(releases);

  console.log(`\n Release rescheduled: ${releases[idx].version}`);
  console.log(`   New time: ${newTime.toLocaleString()}`);
  return true;
}

function listReleases(showAll: boolean): void {
  const releases = readSchedule();

  const filtered = showAll
    ? releases
    : releases.filter(r => r.status === 'pending' || r.status === 'running');

  console.log('\n========================================');
  console.log('  Scheduled Releases');
  console.log('========================================\n');

  if (filtered.length === 0) {
    console.log('No scheduled releases found.');
    return;
  }

  const now = new Date();

  for (const release of filtered.sort((a, b) =>
    new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  )) {
    const scheduledAt = new Date(release.scheduledAt);
    const isPast = scheduledAt < now;
    const timeUntil = formatTimeUntil(scheduledAt);

    const statusIcon = {
      pending: '[PENDING]',
      running: '[RUNNING]',
      completed: '[DONE]',
      failed: '[FAILED]',
      cancelled: '[CANCELLED]',
    }[release.status];

    console.log(`${statusIcon} ${release.version} (${release.id})`);
    console.log(`   Environment: ${release.environment}`);
    console.log(`   Scheduled:   ${scheduledAt.toLocaleString()}`);
    if (release.status === 'pending') {
      console.log(`   Time until:  ${isPast ? 'OVERDUE' : timeUntil}`);
    }
    console.log(`   Scheduled by: ${release.scheduledBy}`);
    if (release.dryRun) {
      console.log(`   Mode:        Dry-run`);
    }
    if (release.notify) {
      console.log(`   Notify:      Yes`);
    }
    console.log('');
  }
}

function formatTimeUntil(date: Date): string {
  const diff = date.getTime() - Date.now();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

async function executeRelease(release: ScheduledRelease): Promise<void> {
  const releases = readSchedule();
  const idx = releases.findIndex(r => r.id === release.id);

  if (idx === -1) return;

  releases[idx].status = 'running';
  releases[idx].result = {
    startedAt: new Date().toISOString(),
    success: false,
  };
  writeSchedule(releases);

  console.log(`\n Executing scheduled release: ${release.version}`);

  try {
    // Send notification if enabled
    if (release.notify) {
      run('pnpm', ['release:notify', release.version, '--dry-run']);
    }

    // Execute release
    const args = release.dryRun
      ? ['release:go-live', 'full', '--dry-run']
      : ['release:go-live', 'full'];

    const result = run('pnpm', args);

    releases[idx].result = {
      startedAt: releases[idx].result!.startedAt,
      completedAt: new Date().toISOString(),
      success: result.success,
      output: result.output.substring(0, 5000), // Limit output size
      error: result.success ? undefined : result.stderr,
    };
    releases[idx].status = result.success ? 'completed' : 'failed';

    if (result.success) {
      console.log(`\n Release completed successfully: ${release.version}`);
    } else {
      console.log(`\n Release failed: ${release.version}`);
      console.log(`   Error: ${result.stderr.substring(0, 200)}`);
    }
  } catch (error) {
    releases[idx].result = {
      startedAt: releases[idx].result!.startedAt,
      completedAt: new Date().toISOString(),
      success: false,
      error: String(error),
    };
    releases[idx].status = 'failed';
  }

  writeSchedule(releases);
}

function checkAndExecuteDue(): void {
  const releases = readSchedule();
  const now = new Date();

  const dueReleases = releases.filter(r =>
    r.status === 'pending' &&
    new Date(r.scheduledAt) <= now
  );

  if (dueReleases.length === 0) {
    console.log('No releases due for execution.');
    return;
  }

  console.log(`Found ${dueReleases.length} release(s) due for execution`);

  for (const release of dueReleases) {
    executeRelease(release);
  }
}

function getNextRelease(): ScheduledRelease | null {
  const releases = readSchedule();
  const pending = releases
    .filter(r => r.status === 'pending')
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  return pending[0] || null;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args.find(a => !a.startsWith('--')) || 'list';

  let version = '';
  let scheduledAt: Date | undefined;
  let environment = 'production';
  let notify = false;
  let dryRun = false;
  let showAll = false;

  // Get version from positional args
  const cmdIdx = args.indexOf(command);
  if (cmdIdx >= 0 && args[cmdIdx + 1] && !args[cmdIdx + 1].startsWith('--')) {
    version = args[cmdIdx + 1];
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--at':
        scheduledAt = parseDateTime(args[++i]);
        break;
      case '--env':
        environment = args[++i];
        break;
      case '--notify':
        notify = true;
        break;
      case '--dry-run':
        dryRun = true;
        break;
      case '--all':
        showAll = true;
        break;
      case '--help':
      case '-h':
        console.log(`
Release Scheduler

Usage: npx tsx scripts/release/release-scheduler.ts <command> [options]

Commands:
  schedule <version>   Schedule a new release
  list                 List scheduled releases
  cancel <id>          Cancel a scheduled release
  reschedule <id>      Reschedule a release
  check                Check and execute due releases
  next                 Show next scheduled release

Options:
  --at <datetime>    Schedule time (ISO format or relative)
  --env <name>       Target environment (default: production)
  --notify           Send notification when release starts
  --dry-run          Schedule without executing release commands
  --all              Show all releases including completed/cancelled

Date Formats:
  ISO:        2024-12-25T14:00:00
  Tomorrow:   "tomorrow 2pm", "tomorrow 14:00"
  Relative:   "in 2 hours", "in 30 minutes"
  Day:        "next monday 9am", "next friday 2pm"

Examples:
  pnpm release:scheduler schedule v5.3.0 --at "tomorrow 2pm"
  pnpm release:scheduler schedule v5.3.0 --at "in 2 hours" --notify
  pnpm release:scheduler schedule v5.3.0 --at "2024-12-25T14:00:00" --env staging
  pnpm release:scheduler list
  pnpm release:scheduler cancel abc123
  pnpm release:scheduler reschedule abc123 --at "next monday 9am"
  pnpm release:scheduler check
`);
        process.exit(0);
    }
  }

  console.log('========================================');
  console.log('  Release Scheduler');
  console.log('========================================');

  switch (command) {
    case 'schedule':
      if (!version) {
        console.error('\nError: Version required');
        console.error('Usage: pnpm release:scheduler schedule <version> --at <datetime>');
        process.exit(1);
      }
      if (!scheduledAt) {
        console.error('\nError: --at datetime required');
        process.exit(1);
      }
      if (scheduledAt < new Date()) {
        console.error('\nError: Cannot schedule release in the past');
        process.exit(1);
      }

      const release = scheduleRelease(version, scheduledAt, environment, notify, dryRun);
      console.log(`\n Release scheduled`);
      console.log(`   ID:          ${release.id}`);
      console.log(`   Version:     ${release.version}`);
      console.log(`   Environment: ${release.environment}`);
      console.log(`   Scheduled:   ${scheduledAt.toLocaleString()}`);
      console.log(`   Time until:  ${formatTimeUntil(scheduledAt)}`);
      if (dryRun) {
        console.log(`   Mode:        Dry-run (no actual release)`);
      }
      break;

    case 'list':
      listReleases(showAll);
      break;

    case 'cancel':
      if (!version) {
        console.error('\nError: Release ID required');
        process.exit(1);
      }
      cancelRelease(version);
      break;

    case 'reschedule':
      if (!version) {
        console.error('\nError: Release ID required');
        process.exit(1);
      }
      if (!scheduledAt) {
        console.error('\nError: --at datetime required');
        process.exit(1);
      }
      rescheduleRelease(version, scheduledAt);
      break;

    case 'check':
      checkAndExecuteDue();
      break;

    case 'next':
      const nextRelease = getNextRelease();
      if (nextRelease) {
        const scheduledTime = new Date(nextRelease.scheduledAt);
        console.log(`\nNext scheduled release:`);
        console.log(`   Version:     ${nextRelease.version}`);
        console.log(`   Environment: ${nextRelease.environment}`);
        console.log(`   Scheduled:   ${scheduledTime.toLocaleString()}`);
        console.log(`   Time until:  ${formatTimeUntil(scheduledTime)}`);
      } else {
        console.log('\nNo releases scheduled.');
      }
      break;

    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
