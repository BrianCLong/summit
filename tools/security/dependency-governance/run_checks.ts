#!/usr/bin/env tsx
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import yaml from 'js-yaml';
import axios from 'axios';

type ViolationType =
  | 'lockfile'
  | 'workflow'
  | 'license'
  | 'license-weak-copyleft'
  | 'cve'
  | 'cve-budget'
  | 'exception-invalid'
  | 'frozen-lockfile';

type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

type Violation = {
  type: ViolationType;
  message: string;
  package?: string;
  license?: string;
  cve?: string | number;
  severity?: string;
};

type ExceptionRecord = {
  type: 'license' | 'cve';
  identifier: string;
  package?: string;
  approvedBy: string;
  ticket: string;
  expires: string;
  signature: string;
};

type Policy = {
  allowLicenses: string[];
  denyLicenses: string[];
  weakCopyleft: string[];
  lockfiles: string[];
  pinnedActionBlocklist: string[];
  pinnedImageBlocklist: string[];
  requireFrozenLockfile?: boolean;
};

type CveTierBudget = {
  critical: number;
  high: number;
  medium: number;
  low: number;
};

type CvePolicy = {
  tiers: Record<string, CveTierBudget>;
  serviceMapping: Record<string, string>;
  defaultTier: string;
  severityThreshold: Severity;
};

type GovernanceResult = {
  violations: Violation[];
  policy: Policy;
  cvePolicy: CvePolicy;
};

const governanceDir = join('tools', 'security', 'dependency-governance');
const outputDir = join(governanceDir, 'output');

function runCommand(cmd: string): string {
  return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function parseArgs(argv: string[]) {
  const result: { exceptionsPath?: string; serviceName?: string; tierOverride?: string } = {};
  argv.forEach((arg, idx) => {
    if (arg === '--exceptions') {
      result.exceptionsPath = argv[idx + 1];
    }
    if (arg === '--service') {
      result.serviceName = argv[idx + 1];
    }
    if (arg === '--tier') {
      result.tierOverride = argv[idx + 1];
    }
  });
  return result;
}

function loadPolicy(): Policy {
  const policyPath = join(governanceDir, 'policy.json');
  const policy: Policy = JSON.parse(readFileSync(policyPath, 'utf8'));
  return policy;
}

function loadCvePolicy(): CvePolicy {
  const path = join(governanceDir, 'cve-policy.yml');
  const data = yaml.load(readFileSync(path, 'utf8')) as Partial<CvePolicy>;
  if (!data?.tiers || !data?.defaultTier) {
    throw new Error('Invalid CVE policy configuration');
  }
  return {
    tiers: data.tiers,
    serviceMapping: data.serviceMapping || {},
    defaultTier: data.defaultTier,
    severityThreshold: (data.severityThreshold || 'high') as Severity,
  };
}

function loadExceptions(path?: string): ExceptionRecord[] {
  if (!path) return [];
  const content = readFileSync(path, 'utf8');
  const data = path.endsWith('.json') ? JSON.parse(content) : (yaml.load(content) as ExceptionRecord[]);
  const now = new Date();
  return (data || []).filter((ex) => {
    const expires = new Date(ex.expires);
    return expires >= now;
  });
}

function assertExceptionsValid(exceptions: ExceptionRecord[], violations: Violation[]) {
  exceptions.forEach((ex) => {
    if (!ex.approvedBy || !ex.ticket || !ex.signature) {
      violations.push({
        type: 'exception-invalid',
        message: `Exception ${ex.identifier} missing approval metadata`,
      });
    }
  });
}

function detectLockfileDrift(policy: Policy, violations: Violation[]) {
  policy.lockfiles.forEach((file) => {
    if (!existsSync(file)) {
      violations.push({ type: 'lockfile', message: `Missing lockfile ${file}` });
      return;
    }
    const status = runCommand(`git status --porcelain ${file}`).trim();
    if (status) {
      violations.push({ type: 'lockfile', message: `${file} has uncommitted changes` });
    }
  });
}

function detectFrozenInstallRequirement(policy: Policy, violations: Violation[]) {
  if (!policy.requireFrozenLockfile) return;
  const envFlag = process.env.PNPM_FROZEN_LOCKFILE || '';
  const installCmd = process.env.INSTALL_CMD || '';
  if (!envFlag && !installCmd.includes('--frozen-lockfile')) {
    violations.push({ type: 'frozen-lockfile', message: 'Installs must use --frozen-lockfile to ensure reproducibility' });
  }
}

function lintWorkflows(policy: Policy, violations: Violation[]) {
  const workflowDir = join('.github', 'workflows');
  if (!existsSync(workflowDir)) return;
  const workflows = readdirSync(workflowDir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
  const usesPattern = /uses:\s*([^\s@]+)(?:@([^\s]+))?/;
  workflows.forEach((wf) => {
    const content = readFileSync(join(workflowDir, wf), 'utf8');
    content.split(/\n/).forEach((line) => {
      const match = line.match(usesPattern);
      if (match) {
        const ref = match[2];
        if (!ref || policy.pinnedActionBlocklist.some((token) => ref.includes(token))) {
          violations.push({ type: 'workflow', message: `${wf} uses unpinned or floating action reference on line: ${line.trim()}` });
        }
      }
      if (line.trim().startsWith('image:')) {
        const imageRef = line.split('image:')[1].trim();
        const hasDigest = imageRef.includes('@sha256:');
        const hasTag = imageRef.includes(':');
        if (!hasDigest && (!hasTag || policy.pinnedImageBlocklist.some((token) => imageRef.includes(token)))) {
          violations.push({ type: 'workflow', message: `${wf} uses non-pinned image ${imageRef}` });
        }
      }
    });
  });
}

type LicenseEntry = {
  licenses?: string | string[];
  dev?: boolean;
};

function loadLicenseData(): Record<string, LicenseEntry> {
  const output = runCommand('pnpm dlx license-checker --json');
  return JSON.parse(output);
}

function checkLicenses(policy: Policy, exceptions: ExceptionRecord[], violations: Violation[]) {
  const data = loadLicenseData();
  Object.entries(data).forEach(([pkg, meta]) => {
    const licenseField = meta.licenses || 'Unknown';
    const licenses = Array.isArray(licenseField) ? licenseField : [licenseField];
    licenses.forEach((license) => {
      const normalized = license.toString();
      const exception = exceptions.find((ex) => ex.type === 'license' && ex.identifier === normalized && ex.package === pkg);
      if (policy.denyLicenses.includes(normalized) && !exception) {
        violations.push({ type: 'license', package: pkg, license: normalized, message: `${pkg} uses denied license ${normalized}` });
        return;
      }
      if (policy.weakCopyleft.includes(normalized) && !meta.dev && !exception) {
        violations.push({
          type: 'license-weak-copyleft',
          package: pkg,
          license: normalized,
          message: `${pkg} uses weak-copyleft license ${normalized} outside tooling/tests`,
        });
      }
      if (!policy.allowLicenses.includes(normalized) && !policy.weakCopyleft.includes(normalized) && !exception) {
        violations.push({ type: 'license', package: pkg, license: normalized, message: `${pkg} uses non-allowlisted license ${normalized}` });
      }
    });
  });
}

type AuditAdvisory = {
  id: string | number;
  module_name?: string;
  severity?: Severity | string;
  title?: string;
};

type AuditReport = {
  advisories?: Record<string, AuditAdvisory>;
  vulnerabilities?: Record<string, AuditAdvisory>;
};

function loadAuditReport(): AuditReport {
  try {
    const auditRaw = runCommand('pnpm audit --json');
    return JSON.parse(auditRaw);
  } catch (err: any) {
    if (err.stdout) {
      return JSON.parse(err.stdout.toString());
    }
    throw err;
  }
}

function severityToKey(sev?: string): Severity {
  const value = (sev || '').toLowerCase();
  if (value === 'critical' || value === 'high') return value as Severity;
  if (value === 'moderate' || value === 'medium') return 'medium';
  if (value === 'low') return 'low';
  return 'info';
}

function severityRank(sev: Severity) {
  switch (sev) {
    case 'critical':
      return 4;
    case 'high':
      return 3;
    case 'medium':
      return 2;
    case 'low':
      return 1;
    default:
      return 0;
  }
}

function checkCves(cvePolicy: CvePolicy, serviceTier: string, exceptions: ExceptionRecord[], violations: Violation[]) {
  const report = loadAuditReport();
  const advisories: AuditAdvisory[] = report.advisories ? Object.values(report.advisories) : report.vulnerabilities ? Object.values(report.vulnerabilities) : [];
  const severityCounts: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  advisories.forEach((adv) => {
    const sev = severityToKey(adv.severity);
    severityCounts[sev] += 1;
    const exception = exceptions.find((ex) => ex.type === 'cve' && `${ex.identifier}` === `${adv.id}`);
    if (!exception && severityRank(sev) >= severityRank(cvePolicy.severityThreshold)) {
      violations.push({ type: 'cve', cve: adv.id, severity: adv.severity, message: `${adv.module_name || 'unknown'}: ${adv.title || 'CVE found'}` });
    }
  });
  const budget = cvePolicy.tiers[serviceTier] || cvePolicy.tiers[cvePolicy.defaultTier];
  if (severityCounts.critical > budget.critical || severityCounts.high > budget.high || severityCounts.medium > budget.medium || severityCounts.low > budget.low) {
    violations.push({ type: 'cve-budget', message: `CVE budget exceeded for tier ${serviceTier}: ${JSON.stringify(severityCounts)} vs budget ${JSON.stringify(budget)}` });
  }
}

function chooseServiceTier(cvePolicy: CvePolicy, serviceName?: string, override?: string) {
  if (override) return override;
  if (serviceName && cvePolicy.serviceMapping[serviceName]) return cvePolicy.serviceMapping[serviceName];
  return cvePolicy.defaultTier;
}

function ensureOutputDir() {
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
}

function writeReports(result: GovernanceResult) {
  ensureOutputDir();
  const reportPath = join(outputDir, 'report.json');
  writeFileSync(reportPath, JSON.stringify(result, null, 2));
  const sarifPath = join(outputDir, 'report.sarif');
  writeFileSync(sarifPath, JSON.stringify(buildSarif(result), null, 2));
  return { reportPath, sarifPath };
}

function buildSarif(result: GovernanceResult) {
  return {
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'dependency-governance',
            informationUri: 'https://github.com',
            version: '1.0.0',
            rules: result.violations.map((v, idx) => ({
              id: `${v.type}-${idx}`,
              shortDescription: { text: v.message },
              fullDescription: { text: v.message },
            })),
          },
        },
        results: result.violations.map((v, idx) => ({
          ruleId: `${v.type}-${idx}`,
          level: ['critical', 'high'].includes((v.severity || '').toLowerCase()) ? 'error' : 'warning',
          message: { text: v.message },
          locations: [
            {
              physicalLocation: {
                artifactLocation: { uri: 'package-lock' },
              },
            },
          ],
        })),
      },
    ],
  };
}

async function pushTickets(violations: Violation[]) {
  const webhook = process.env.SECURITY_TICKETING_WEBHOOK;
  if (!webhook || violations.length === 0) return;
  try {
    await axios.post(webhook, {
      source: 'dependency-governance',
      violations,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Failed to push ticket payload', err);
  }
}

async function runGovernance(options: { exceptionsPath?: string; serviceName?: string; tierOverride?: string }): Promise<GovernanceResult> {
  const policy = loadPolicy();
  const cvePolicy = loadCvePolicy();
  const exceptions = loadExceptions(options.exceptionsPath);
  const violations: Violation[] = [];
  assertExceptionsValid(exceptions, violations);
  detectLockfileDrift(policy, violations);
  detectFrozenInstallRequirement(policy, violations);
  lintWorkflows(policy, violations);
  checkLicenses(policy, exceptions, violations);
  const tier = chooseServiceTier(cvePolicy, options.serviceName, options.tierOverride);
  checkCves(cvePolicy, tier, exceptions, violations);
  const result: GovernanceResult = { violations, policy, cvePolicy };
  writeReports(result);
  await pushTickets(violations);
  return result;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await runGovernance(args);
  if (result.violations.length > 0) {
    console.error('Dependency governance failed:', result.violations.map((v) => v.message).join('\n'));
    process.exit(1);
  }
  console.log('Dependency governance checks passed.');
}

if (process.argv[1]?.includes('run_checks')) {
  void main();
}

export { runGovernance, parseArgs, loadPolicy, loadCvePolicy, loadExceptions, buildSarif };
