export const ENVIRONMENT_LIMITATION_PATTERNS = [
  /responded with 403/i,
  /ENOTFOUND/i,
  /ECONNREFUSED/i,
  /network/i,
  /permission denied/i,
];

export function classifyCheckResult({ code, stdout = "", stderr = "" }) {
  if (code === 0) {
    return { status: "passed", reason: "command exited successfully" };
  }

  const combined = `${stdout}\n${stderr}`;
  for (const pattern of ENVIRONMENT_LIMITATION_PATTERNS) {
    if (pattern.test(combined)) {
      return {
        status: "warning",
        reason: "environment limitation detected",
      };
    }
  }

  return {
    status: "failed",
    reason: "command reported a hard failure",
  };
}

export function summarizeReport(results) {
  return results.reduce(
    (acc, current) => {
      acc[current.status] += 1;
      return acc;
    },
    { passed: 0, warning: 0, failed: 0 }
  );
}
