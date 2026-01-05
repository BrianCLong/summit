// scripts/release/check-freeze.mjs

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
