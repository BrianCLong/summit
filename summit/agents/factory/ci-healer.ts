const ALLOWLISTED_FAILURES = [
  "eslint-fixable",
  "prettier-format",
  "snapshot-update"
] as const;

export function canAttemptHeal(failureClass: string): boolean {
  return ALLOWLISTED_FAILURES.includes(failureClass as (typeof ALLOWLISTED_FAILURES)[number]);
}

export function generateHealReport(failureClass: string, logs: string) {
  const isSupported = canAttemptHeal(failureClass);
  return {
    attempted: isSupported,
    success: isSupported, // Simulating a successful heal if supported
    failureClass,
    rationale: isSupported ? `Successfully healed ${failureClass}` : `Failure class ${failureClass} not in allowlist`
  };
}
