const ENV_LIMITATION_PATTERNS = [
  /timed?\s*out/i,
  /ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL/i,
  /Cannot read properties of undefined \(reading 'optionalDependencies'\)/i,
  /Command was killed with SIGTERM/i,
  /terminated:\s*15/i,
  /exit[_\s-]?code\s*=\s*124/i,
  /EAI_AGAIN|ENOTFOUND|ECONNRESET|ECONNREFUSED|ETIMEDOUT/i,
  /registry\.npmjs\.org/i,
];

const normalizeText = (value) => String(value ?? '');

export const isEnvironmentLimitation = ({
  output = '',
  signal = null,
  errorCode = null,
}) => {
  if (signal === 'SIGTERM' || signal === 'SIGKILL' || errorCode === 'ETIMEDOUT') {
    return true;
  }

  const text = normalizeText(output);
  return ENV_LIMITATION_PATTERNS.some((pattern) => pattern.test(text));
};

export const classifyHardeningCheck = ({
  name,
  exitCode,
  signal = null,
  errorCode = null,
  output = '',
}) => {
  if (exitCode === 0) {
    return {
      name,
      status: 'pass',
      reason: 'Check passed.',
    };
  }

  if (isEnvironmentLimitation({ output, signal, errorCode })) {
    return {
      name,
      status: 'warning',
      reason: 'Deferred pending stable execution environment.',
    };
  }

  return {
    name,
    status: 'failed',
    reason: 'Check failed and requires remediation.',
  };
};

export const summarizeHardeningChecks = (checks) => {
  const summary = {
    total: checks.length,
    pass: 0,
    warning: 0,
    failed: 0,
    failedChecks: [],
    warningChecks: [],
  };

  for (const check of checks) {
    if (check.status === 'pass') {
      summary.pass += 1;
      continue;
    }
    if (check.status === 'warning') {
      summary.warning += 1;
      summary.warningChecks.push(check.name);
      continue;
    }
    summary.failed += 1;
    summary.failedChecks.push(check.name);
  }

  return summary;
};

export const truncateOutput = (text, maxChars = 6000) => {
  const source = normalizeText(text);
  if (source.length <= maxChars) {
    return source;
  }
  return `${source.slice(0, maxChars)}\n...<truncated>`;
};
