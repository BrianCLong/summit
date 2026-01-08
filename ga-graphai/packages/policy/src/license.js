import { LICENSE_ALLOW_LIST, LICENSE_DENY_LIST } from "common-types";

/**
 * Evaluate license compatibility with configured allow/deny lists.
 * @param {string} license
 * @param {{allow?: string[], deny?: string[], allowPaidOverride?: boolean}} [options]
 * @param {{allowPaid?: boolean}} [signals]
 * @returns {{status: 'allow' | 'deny', reason?: string}}
 */
export function evaluateLicense(license, options = {}, signals = {}) {
  const allow = options.allow ?? LICENSE_ALLOW_LIST;
  const deny = options.deny ?? LICENSE_DENY_LIST;
  const allowPaid = Boolean(options.allowPaidOverride ?? signals.allowPaid);

  if (deny.includes(license)) {
    return { status: "deny", reason: "LICENSE_DENY_LIST" };
  }

  if (allow.includes(license)) {
    return { status: "allow" };
  }

  if (!allowPaid) {
    return { status: "deny", reason: "LICENSE_APPROVAL_REQUIRED" };
  }

  return { status: "allow" };
}
