import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_POLICY_PATH = '.github/policies/devenv-policy.json';
const DEFAULT_EXCEPTIONS_PATH = '.github/policies/devenv-exceptions.json';
const DEFAULT_EVIDENCE_DIR = 'evidence';

function readJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return { value: JSON.parse(raw), error: null };
  } catch (error) {
    return { value: null, error };
  }
}

function resolvePath(rootDir, targetPath) {
  return path.isAbsolute(targetPath)
    ? targetPath
    : path.join(rootDir, targetPath);
}

function loadPolicy(rootDir, policyPath = DEFAULT_POLICY_PATH) {
  const resolved = resolvePath(rootDir, policyPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Policy file not found: ${resolved}`);
  }
  const { value, error } = readJson(resolved);
  if (error) {
    throw new Error(`Failed to parse policy file: ${error.message}`);
  }
  if (!value || !Array.isArray(value.rules)) {
    throw new Error('Policy file must include a rules array.');
  }
  return { policy: value, path: resolved };
}

function loadExceptions(rootDir, exceptionsPath = DEFAULT_EXCEPTIONS_PATH) {
  const resolved = resolvePath(rootDir, exceptionsPath);
  if (!fs.existsSync(resolved)) {
    return { exceptions: [], path: resolved, missing: true };
  }
  const { value, error } = readJson(resolved);
  if (error) {
    throw new Error(`Failed to parse exceptions file: ${error.message}`);
  }
  const exceptions = Array.isArray(value?.exceptions) ? value.exceptions : [];
  return { exceptions, path: resolved, missing: false };
}

function findLifecycleKeyFindings(rule, content) {
  if (!rule.keys) {
    return [];
  }
  return rule.keys
    .filter((key) => Object.prototype.hasOwnProperty.call(content, key))
    .map((key) => ({
      path: rule.path,
      ruleId: rule.id,
      message: `Disallowed key: ${key}`,
      match: key,
    }));
}

function normalizeRunOnValues(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry));
  }
  if (value === undefined || value === null) {
    return [];
  }
  return [String(value)];
}

function findTaskAutorunFindings(rule, content) {
  const runOnAllowlist = new Set(
    Array.isArray(rule.runOnValues) ? rule.runOnValues : [],
  );
  const tasks = Array.isArray(content?.tasks) ? content.tasks : [];
  const findings = [];
  for (const task of tasks) {
    const runOnValues = normalizeRunOnValues(task?.runOptions?.runOn);
    for (const runOn of runOnValues) {
      if (runOnAllowlist.has(runOn)) {
        findings.push({
          path: rule.path,
          ruleId: rule.id,
          message: `Disallowed runOn trigger: ${runOn}`,
          match: runOn,
        });
      }
    }
  }
  return findings;
}

function findPromptCommandFindings(rule, content) {
  const payload = JSON.stringify(content);
  const findings = [];
  const patterns = Array.isArray(rule.contains) ? rule.contains : [];
  for (const pattern of patterns) {
    if (payload.includes(pattern)) {
      findings.push({
        path: rule.path,
        ruleId: rule.id,
        message: `Disallowed pattern detected: ${pattern}`,
        match: pattern,
      });
    }
  }
  return findings;
}

function scanRule(rule, content) {
  if (rule.keys) {
    return findLifecycleKeyFindings(rule, content);
  }
  if (rule.runOnValues) {
    return findTaskAutorunFindings(rule, content);
  }
  if (rule.contains) {
    return findPromptCommandFindings(rule, content);
  }
  return [];
}

function isExceptionValid(exception, now) {
  if (!exception?.id || !exception?.owner || !exception?.reason) {
    return false;
  }
  if (!Array.isArray(exception.paths) || exception.paths.length === 0) {
    return false;
  }
  if (!Array.isArray(exception.evidenceIds) || exception.evidenceIds.length === 0) {
    return false;
  }
  if (!exception.expiresOn) {
    return false;
  }
  const expiresAt = new Date(exception.expiresOn);
  if (Number.isNaN(expiresAt.getTime())) {
    return false;
  }
  return expiresAt.getTime() >= now.getTime();
}

function exceptionMatchesFinding(exception, finding) {
  if (!exception.paths.includes(finding.path)) {
    return false;
  }
  if (Array.isArray(exception.ruleIds) && exception.ruleIds.length > 0) {
    if (!exception.ruleIds.includes(finding.ruleId)) {
      return false;
    }
  }
  if (Array.isArray(exception.keys) && exception.keys.length > 0) {
    if (!finding.match || !exception.keys.includes(finding.match)) {
      return false;
    }
  }
  return true;
}

function applyExceptions(findings, exceptions) {
  const remaining = [];
  const applied = [];
  for (const finding of findings) {
    const match = exceptions.find((exception) =>
      exceptionMatchesFinding(exception, finding),
    );
    if (match) {
      applied.push({
        id: match.id,
        path: finding.path,
        ruleId: finding.ruleId,
        match: finding.match ?? null,
      });
    } else {
      remaining.push(finding);
    }
  }
  return { remaining, applied };
}

export function scanDevenvPolicy({
  rootDir = process.cwd(),
  policyPath = DEFAULT_POLICY_PATH,
  exceptionsPath = DEFAULT_EXCEPTIONS_PATH,
  now = new Date(),
} = {}) {
  const { policy } = loadPolicy(rootDir, policyPath);
  const { exceptions } = loadExceptions(rootDir, exceptionsPath);

  const scannedFiles = [];
  const findings = [];

  for (const rule of policy.rules) {
    const targetPath = resolvePath(rootDir, rule.path);
    if (!fs.existsSync(targetPath)) {
      continue;
    }
    scannedFiles.push(rule.path);
    const { value, error } = readJson(targetPath);
    if (error || value === null) {
      findings.push({
        path: rule.path,
        ruleId: 'JSON_PARSE_ERROR',
        message: 'Invalid JSON',
        match: null,
      });
      continue;
    }
    findings.push(...scanRule(rule, value));
  }

  const validExceptions = exceptions.filter((exception) =>
    isExceptionValid(exception, now),
  );
  const invalidExceptions = exceptions.filter(
    (exception) => !isExceptionValid(exception, now),
  );

  const { remaining, applied } = applyExceptions(findings, validExceptions);
  const decision = remaining.length > 0 ? 'fail' : 'pass';

  return {
    policyId: policy.policyId ?? 'devenv-auto-exec',
    policyVersion: policy.version ?? '0.0.0',
    decision,
    findings: remaining,
    scannedFiles,
    exceptionsApplied: applied,
    invalidExceptions: invalidExceptions.map((exception) => ({
      id: exception.id ?? 'unknown',
      owner: exception.owner ?? 'unknown',
      expiresOn: exception.expiresOn ?? null,
    })),
  };
}

function writeEvidence({ rootDir, report, metrics }) {
  const evidenceDir = path.join(rootDir, DEFAULT_EVIDENCE_DIR);
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(
    path.join(evidenceDir, 'report.json'),
    JSON.stringify(report, null, 2),
  );
  fs.writeFileSync(
    path.join(evidenceDir, 'metrics.json'),
    JSON.stringify(metrics, null, 2),
  );
}

function runPolicyCheck() {
  const enforce = process.env.DEVENV_POLICY_ENFORCE !== 'off';
  const result = scanDevenvPolicy({});

  const report = {
    policyId: result.policyId,
    policyVersion: result.policyVersion,
    decision: result.decision,
    findings: result.findings,
    scannedFiles: result.scannedFiles,
    exceptionsApplied: result.exceptionsApplied,
    invalidExceptions: result.invalidExceptions,
    inputs: {
      commit: process.env.GITHUB_SHA || 'unknown',
      ref: process.env.GITHUB_REF || null,
    },
  };

  const metrics = {
    policyId: result.policyId,
    policyVersion: result.policyVersion,
    scannedFiles: result.scannedFiles.length,
    findings: result.findings.length,
    exceptionsApplied: result.exceptionsApplied.length,
  };

  writeEvidence({ rootDir: process.cwd(), report, metrics });

  if (enforce && result.decision === 'fail') {
    console.error('DevEnv auto-exec policy failed.', result.findings);
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runPolicyCheck();
}
