import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const POLICY_PATH = path.resolve(__dirname, '../../release-policy.yml');
const OUTPUT_PATH = path.resolve(__dirname, '../../dist/release/freeze.json');

// Simple regex-based YAML parser for the specific structure of release-policy.yml
function parsePolicy(content) {
  const policy = {
    freeze: { windows: [], timezone: 'UTC' },
    override: {}
  };

  const lines = content.split('\n');
  let currentSection = null;
  let currentWindow = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (line.match(/^freeze:/)) {
      currentSection = 'freeze';
      continue;
    }
    if (line.match(/^override:/)) {
      currentSection = 'override';
      continue;
    }

    if (currentSection === 'freeze') {
      if (trimmed.startsWith('enabled:')) policy.freeze.enabled = trimmed.split(':')[1].trim() === 'true';
      if (trimmed.startsWith('timezone:')) policy.freeze.timezone = trimmed.split(':')[1].trim();

      if (line.match(/^\s+windows:/)) continue; // Skip windows header

      if (line.match(/^\s+-\s+name:/)) {
        // New window
        const name = line.split('name:')[1].trim().replace(/^"|"$/g, '');
        currentWindow = { name, active: false }; // Default active to false unless set
        policy.freeze.windows.push(currentWindow);
      } else if (currentWindow && line.startsWith('      ')) { // Inside window properties (approx indent check)
         if (trimmed.startsWith('rrule:')) currentWindow.rrule = trimmed.split('rrule:')[1].trim().replace(/^"|"$/g, '');
         if (trimmed.startsWith('start:')) currentWindow.start = trimmed.split('start:')[1].trim().replace(/^"|"$/g, '');
         if (trimmed.startsWith('end:')) currentWindow.end = trimmed.split('end:')[1].trim().replace(/^"|"$/g, '');
         if (trimmed.startsWith('active:')) currentWindow.active = trimmed.split('active:')[1].trim() === 'true';
      }
    }

    if (currentSection === 'override') {
      if (trimmed.startsWith('allowed:')) policy.override.allowed = trimmed.split(':')[1].trim() === 'true';
      if (trimmed.startsWith('require_reason:')) policy.override.require_reason = trimmed.split(':')[1].trim() === 'true';
      if (trimmed.startsWith('reason_min_len:')) policy.override.reason_min_len = parseInt(trimmed.split(':')[1].trim(), 10);
    }
  }
  return policy;
}

/**
 * Checks if a given timestamp is within a release freeze window.
 * @param {object} policy - The release freeze policy.
 * @param {string} nowIsoInTzOrComparable - The timestamp to check, in ISO 8601 format.
 * @returns {boolean} True if the timestamp is within a freeze window, false otherwise.
 */
export function isFrozen(policy, nowIsoInTzOrComparable) {
  const now = new Date(nowIsoInTzOrComparable);

  // Check for weekend freezes in UTC to ensure deterministic behavior
  const dayOfWeek = now.toLocaleString('en-US', { weekday: 'long', timeZone: 'UTC' });
  if (policy.weekends && policy.weekends.includes(dayOfWeek)) {
    return true;
  }

  // Check for explicit date range freezes
  if (policy.ranges) {
    for (const range of policy.ranges) {
      const from = new Date(range.from);
      const to = new Date(range.to);
      if (now >= from && now <= to) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Validates a release freeze override.
 * @param {object} policy - The release freeze policy.
 * @param {boolean} override - Whether an override is being attempted.
 * @param {string} reason - The reason for the override.
 * @returns {void} Throws an error if the override is invalid.
 */
export function validateOverride(policy, override, reason) {
  if (!override) {
    return;
  }

  const minLength = policy.overrideMinLength || 1;
  if (!reason || reason.length < minLength) {
    throw new Error(
      `Override reason must be at least ${minLength} characters long.`
    );
  }
}

async function main() {
  let exitCode = 0;
  try {
    const policyContent = fs.readFileSync(POLICY_PATH, 'utf8');
    const policy = parsePolicy(policyContent);

    // Inputs
    const envNow = process.env.NOW;
    const override = process.env.OVERRIDE === 'true';
    const overrideReason = process.env.OVERRIDE_REASON || '';

    let now;
    if (envNow) {
      now = new Date(envNow);
      if (isNaN(now.getTime())) {
        throw new Error(`Invalid NOW date: ${envNow}`);
      }
    } else {
      now = new Date();
    }

    const timezone = policy.freeze.timezone || 'UTC';

    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'short',
      hour12: false
    });

    const parts = dateFormatter.formatToParts(now);
    const getPart = (type) => parts.find(p => p.type === type).value;

    const weekday = getPart('weekday').toUpperCase();
    const year = getPart('year');
    const month = getPart('month');
    const day = getPart('day');
    const hour = getPart('hour');
    const minute = getPart('minute');
    const second = getPart('second');

    const nowWallTimeISO = `${year}-${month}-${day}T${hour}:${minute}:${second}`;

    const rruleDayMap = {
      'MON': 'MO', 'TUE': 'TU', 'WED': 'WE', 'THU': 'TH', 'FRI': 'FR', 'SAT': 'SA', 'SUN': 'SU'
    };
    const currentRRuleDay = rruleDayMap[weekday];

    let isFrozenNow = false;
    let matchedWindow = null;

    if (policy.freeze.enabled) {
      for (const window of policy.freeze.windows) {
        if (!window.active) continue;

        if (window.rrule && window.rrule.includes('FREQ=WEEKLY')) {
          const match = window.rrule.match(/BYDAY=([^;]+)/);
          if (match) {
            const days = match[1].split(',');
            if (days.includes(currentRRuleDay)) {
              isFrozenNow = true;
              matchedWindow = window.name;
              break;
            }
          }
        }

        if (window.start && window.end) {
          if (nowWallTimeISO >= window.start && nowWallTimeISO <= window.end) {
            isFrozenNow = true;
            matchedWindow = window.name;
            break;
          }
        }
      }
    }

    const result = {
      frozen: isFrozenNow,
      matched: matchedWindow,
      override: false,
      at: now.toISOString(),
      wallTime: nowWallTimeISO
    };

    let summaryMessage = '';

    if (isFrozenNow) {
      if (override && policy.override.allowed) {
        if (policy.override.require_reason) {
          if (!overrideReason || overrideReason.length < policy.override.reason_min_len) {
            console.error(`ERROR: Freeze override requires a reason of at least ${policy.override.reason_min_len} characters.`);
            exitCode = 1; // Mark as failed
          }
        }
        if (exitCode === 0) {
          console.log(`WARN: Release freeze active (${matchedWindow}), but override provided. Proceeding.`);
          console.log(`Override Reason: ${overrideReason}`);
          result.override = true;
          summaryMessage = `❄️ Frozen (${matchedWindow}) but **OVERRIDDEN** by user. Reason: "${overrideReason}"`;
        }
      } else {
        console.error(`ERROR: Release freeze is active: ${matchedWindow}.`);
        console.error(`Current time (${timezone}): ${nowWallTimeISO}`);
        console.error(`To override, set 'override_freeze' to true and provide a 'override_reason'.`);
        exitCode = 1;
        summaryMessage = `❄️ **FROZEN** (${matchedWindow}). Release Blocked.`;
      }
    } else {
      console.log('Release freeze is not active.');
      summaryMessage = '✅ Not frozen';
    }

    // Write output BEFORE exiting
    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2));

    if (process.env.GITHUB_STEP_SUMMARY) {
      const summary = [
        `### Release Freeze Status`,
        `- **Status**: ${summaryMessage}`,
        `- **Window**: ${matchedWindow || 'None'}`,
        `- **Time**: ${nowWallTimeISO} (${timezone})`
      ].join('\n');
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + '\n');
    }

    process.exit(exitCode);

  } catch (err) {
    console.error('Fatal error checking freeze status:', err);
    process.exit(1);
  }
}

// Only run main when executed directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
