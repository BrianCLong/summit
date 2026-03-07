export const DEFAULT_ENVIRONMENT_LIMITATION_PATTERNS = [
  /responded with 403/i,
  /EAI_AGAIN/i,
  /ENOTFOUND/i,
  /ECONNREFUSED/i,
  /ETIMEDOUT/i,
  /network is unreachable/i,
  /permission denied/i,
  /self-signed certificate/i,
];

export function parseCliArgs(argv) {
  const args = {
    outFile: "artifacts/ga-hardening-audit.json",
    failOnWarning: false,
    includeOutput: false,
    timeoutMs: 15 * 60 * 1000,
    maxOutputChars: 6000,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--out" && argv[index + 1]) {
      args.outFile = argv[index + 1];
      index += 1;
      continue;
    }

    if (token === "--fail-on-warning") {
      args.failOnWarning = true;
      continue;
    }

    if (token === "--include-output") {
      args.includeOutput = true;
      continue;
    }

    if (token === "--timeout-ms" && argv[index + 1]) {
      args.timeoutMs = Number(argv[index + 1]);
      index += 1;
      continue;
    }

    if (token === "--max-output-chars" && argv[index + 1]) {
      args.maxOutputChars = Number(argv[index + 1]);
      index += 1;
    }
  }

  return args;
}

export function truncateOutput(raw, maxOutputChars) {
  if (!raw) {
    return "";
  }

  if (raw.length <= maxOutputChars) {
    return raw;
  }

  return `${raw.slice(0, maxOutputChars)}\n... [truncated ${raw.length - maxOutputChars} chars]`;
}

export function classifyCheckResult({
  code,
  stdout = "",
  stderr = "",
  limitationPatterns = DEFAULT_ENVIRONMENT_LIMITATION_PATTERNS,
}) {
  if (code === 0) {
    return { status: "passed", reason: "command exited successfully" };
  }

  const combined = `${stdout}\n${stderr}`;
  for (const pattern of limitationPatterns) {
    if (pattern.test(combined)) {
      return {
        status: "warning",
        reason: `environment limitation detected (${pattern.source})`,
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
    (accumulator, current) => {
      accumulator[current.status] += 1;
      return accumulator;
    },
    { passed: 0, warning: 0, failed: 0 }
  );
}

export function iconForStatus(status) {
  if (status === "passed") {
    return "PASS";
  }

  if (status === "warning") {
    return "WARN";
  }

  return "FAIL";
}
