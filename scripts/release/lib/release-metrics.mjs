import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export const DEFAULT_DENYLIST = [
  /https?:\/\//i,
  /github_pat_[A-Za-z0-9_]+/,
  /ghp_[A-Za-z0-9]+/,
  /AKIA[0-9A-Z]{16}/,
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/i,
];

export const readJsonFile = (filePath) => {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
};

export const writeJsonFile = (filePath, data) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
};

export const sha256File = (filePath) => {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
};

const walkDir = (dir, entries = []) => {
  const children = fs.readdirSync(dir, { withFileTypes: true });
  for (const child of children) {
    const fullPath = path.join(dir, child.name);
    if (child.isDirectory()) {
      walkDir(fullPath, entries);
    } else {
      entries.push(fullPath);
    }
  }
  return entries;
};

export const collectDashboardFiles = (dir) => {
  if (!fs.existsSync(dir)) {
    return [];
  }
  const files = walkDir(dir);
  return files.filter((file) => path.basename(file) === 'dashboard.json');
};

export const redactDashboard = (dashboard) => {
  const redactedCandidates = (dashboard.candidates || []).map((candidate) => {
    const checks = (candidate.checks || []).map((check) => ({
      name: check.name,
      required: check.required,
      status: check.status,
      conclusion: check.conclusion,
    }));
    return {
      candidate_type: candidate.candidate_type,
      tag: candidate.tag,
      commit_sha: candidate.commit_sha,
      base_sha: candidate.base_sha,
      changed_files_count: candidate.changed_files_count,
      promotable_state: candidate.promotable_state,
      top_blocker: candidate.top_blocker,
      checks,
      generated_at: candidate.generated_at,
      generator_version: candidate.generator_version,
    };
  });

  return {
    repository: dashboard.repository,
    generated_at: dashboard.generated_at,
    generator_version: dashboard.generator_version,
    candidates: redactedCandidates,
    summary: dashboard.summary,
  };
};

const scanValue = (value, denylist, findings) => {
  if (typeof value === 'string') {
    for (const pattern of denylist) {
      if (pattern.test(value)) {
        findings.push({ value, pattern: pattern.toString() });
      }
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      scanValue(item, denylist, findings);
    }
    return;
  }

  if (value && typeof value === 'object') {
    for (const entry of Object.values(value)) {
      scanValue(entry, denylist, findings);
    }
  }
};

export const enforceDenylist = (data, denylist = DEFAULT_DENYLIST) => {
  const findings = [];
  scanValue(data, denylist, findings);
  if (findings.length > 0) {
    const summary = findings
      .map((finding) => `${finding.pattern} matched ${finding.value}`)
      .join('; ');
    const error = new Error(`Redaction denylist violation: ${summary}`);
    error.findings = findings;
    throw error;
  }
};

export const median = (values) => {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
};

export const quantile = (values, percentile) => {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil(percentile * sorted.length) - 1;
  return sorted[Math.min(Math.max(index, 0), sorted.length - 1)];
};

export const summarizeDurations = (values) => ({
  p50: median(values),
  p95: quantile(values, 0.95),
});

export const groupBy = (items, keyFn) => {
  const grouped = new Map();
  for (const item of items) {
    const key = keyFn(item);
    const bucket = grouped.get(key) || [];
    bucket.push(item);
    grouped.set(key, bucket);
  }
  return grouped;
};
