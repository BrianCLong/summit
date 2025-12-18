#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function loadJson(filePath) {
  const fullPath = path.resolve(filePath);
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

function requireArg(args, name) {
  const value = args[name];
  if (!value) {
    throw new Error(`Missing required argument --${name}`);
  }
  return value;
}

function parseArgs(argv) {
  const args = {};
  argv.forEach((item, index) => {
    if (item.startsWith('--')) {
      const key = item.replace(/^--/, '');
      const next = argv[index + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
      } else {
        args[key] = true;
      }
    }
  });
  return args;
}

function validateExceptions(policy, exceptions) {
  const required = policy.licenses.dualControl.requiredApprovals;
  const roles = policy.licenses.dualControl.approverRoles || [];
  const errors = [];

  exceptions.exceptions.forEach((entry) => {
    const approvers = entry.approvals || [];
    const unique = new Set(approvers.map((a) => a.name));
    if (unique.size < required) {
      errors.push(`Exception ${entry.id} does not meet dual-control requirement (${unique.size}/${required}).`);
    }
    roles.forEach((role) => {
      if (!approvers.find((a) => a.role === role)) {
        errors.push(`Exception ${entry.id} missing approver with role ${role}.`);
      }
    });
    const expiry = new Date(entry.expiresAt);
    if (Number.isNaN(expiry.getTime())) {
      errors.push(`Exception ${entry.id} has invalid expiry ${entry.expiresAt}.`);
    } else if (expiry < new Date()) {
      errors.push(`Exception ${entry.id} expired on ${entry.expiresAt}.`);
    }
  });

  return errors;
}

function checkLicenses(policy, licenses, exceptions) {
  const blocked = new Set(policy.licenses.blocked);
  const exceptionMap = new Map();
  exceptions.exceptions.forEach((entry) => {
    exceptionMap.set(`${entry.package}:${entry.license}`, entry);
  });

  const violations = [];
  licenses.dependencies.forEach((dep) => {
    const key = `${dep.name}:${dep.license}`;
    if (blocked.has(dep.license)) {
      if (!exceptionMap.has(key)) {
        violations.push(`Dependency ${dep.name}@${dep.version} uses blocked license ${dep.license}.`);
      }
    }
  });
  return violations;
}

function checkVulns(policy, vulns) {
  const blockedSeverities = new Set(policy.cvss.blockedSeverities.map((s) => s.toLowerCase()));
  const maxScore = policy.cvss.maxBaseScore;
  const violations = [];
  vulns.vulnerabilities.forEach((v) => {
    if (blockedSeverities.has(v.severity.toLowerCase())) {
      violations.push(`${v.id} severity ${v.severity} is blocked.`);
    }
    if (v.cvss > maxScore) {
      violations.push(`${v.id} CVSS ${v.cvss} exceeds baseline ${maxScore}.`);
    }
  });
  return violations;
}

function renderBurnDown(vulns) {
  const buckets = {};
  vulns.vulnerabilities.forEach((v) => {
    const sev = v.severity.toLowerCase();
    buckets[sev] = (buckets[sev] || 0) + 1;
  });
  const output = {
    generatedAt: new Date().toISOString(),
    totals: buckets
  };
  fs.mkdirSync(path.resolve(__dirname, '..', 'manifests'), { recursive: true });
  const outfile = path.resolve(__dirname, '..', 'manifests', 'vuln-burn-down.json');
  fs.writeFileSync(outfile, JSON.stringify(output, null, 2));
  console.log(`Wrote burn-down snapshot to ${outfile}`);
}

function help() {
  console.log(`Usage:
  license-check --policy <path> --licenses <path> --exceptions <path>
  vuln-policy --policy <path> --vulns <path>
  burn-down --vulns <path>
`);
}

function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  try {
    switch (command) {
      case 'license-check': {
        const policy = loadJson(requireArg(args, 'policy'));
        const licenses = loadJson(requireArg(args, 'licenses'));
        const exceptions = loadJson(requireArg(args, 'exceptions'));
        const dualControlErrors = validateExceptions(policy, exceptions);
        const licenseViolations = checkLicenses(policy, licenses, exceptions);
        const errors = [...dualControlErrors, ...licenseViolations];
        if (errors.length) {
          errors.forEach((e) => console.error(e));
          process.exitCode = 1;
        } else {
          console.log('License policy satisfied.');
        }
        break;
      }
      case 'vuln-policy': {
        const policy = loadJson(requireArg(args, 'policy'));
        const vulns = loadJson(requireArg(args, 'vulns'));
        const violations = checkVulns(policy, vulns);
        if (violations.length) {
          violations.forEach((e) => console.error(e));
          process.exitCode = 1;
        } else {
          console.log('Vulnerability policy satisfied.');
        }
        break;
      }
      case 'burn-down': {
        const vulns = loadJson(requireArg(args, 'vulns'));
        renderBurnDown(vulns);
        break;
      }
      case '--help':
      case '-h':
      default:
        help();
        break;
    }
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  }
}

main();
