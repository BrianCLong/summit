import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

const POLICY_PATH = path.join(rootDir, 'policy/release-deps-policy.json');
const DIFF_PATH = path.join(rootDir, 'dist/evidence/deps/deps-diff.json');
const LICENSE_PATH = path.join(rootDir, 'dist/evidence/licenses/license-inventory.json');
const OUTPUT_PATH = path.join(rootDir, 'dist/evidence/deps/policy-check.json');

// Types (simplified from previous definitions)
interface Policy {
  risk_tiers: Record<string, any>;
  license_policy: {
    allow: string[];
    deny: string[];
    review_required: string[];
  };
  package_policy: {
    allowed_scopes: string[];
    flagged_packages: string[];
  };
}

interface DiffReport {
  added: { name: string; versionInfo: string }[];
  changed: { name: string; oldVersion: string; newVersion: string }[];
  removed: any[];
}

interface LicenseEntry {
  package: string;
  license: string;
}

interface Violation {
  rule: string;
  package: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  message: string;
}

interface PolicyResult {
  status: 'PASS' | 'FAIL' | 'NEEDS_APPROVAL';
  violations: Violation[];
  requiresApproval: boolean;
  minApprovers: number;
}

function matchScope(pkgName: string, scopes: string[]): boolean {
  return scopes.some(scope => {
    if (scope.endsWith('/*')) {
      const prefix = scope.slice(0, -2); // remove /*
      return pkgName.startsWith(prefix);
    }
    return pkgName === scope;
  });
}

function main() {
  console.log('Evaluating Release Policy...');

  if (!fs.existsSync(POLICY_PATH)) {
    console.error('Policy file missing!');
    process.exit(1);
  }
  const policy: Policy = JSON.parse(fs.readFileSync(POLICY_PATH, 'utf-8'));

  if (!fs.existsSync(DIFF_PATH)) {
     console.error('Diff report missing! Run diff_dependency_baseline.ts first.');
     process.exit(1);
  }
  const diff: DiffReport = JSON.parse(fs.readFileSync(DIFF_PATH, 'utf-8'));

  const licenses: LicenseEntry[] = fs.existsSync(LICENSE_PATH)
    ? JSON.parse(fs.readFileSync(LICENSE_PATH, 'utf-8'))
    : [];

  const licenseMap = new Map(licenses.map(l => [l.package, l.license]));

  const result: PolicyResult = {
    status: 'PASS',
    violations: [],
    requiresApproval: false,
    minApprovers: 0
  };

  // Rule 1: New Dependencies
  diff.added.forEach(pkg => {
    result.violations.push({
      rule: 'new_dependency',
      package: pkg.name,
      severity: 'MEDIUM',
      message: `New dependency added: ${pkg.name}@${pkg.versionInfo}`
    });

    // Check if disallowed scope
    // Note: Implicit rule - if not in allowed scopes, it might be higher risk?
    // The policy JSON has allowed_scopes, but doesn't explicitly say "deny others".
    // We will just flag it if it's new.
  });

  // Rule 2: License Check (Added or Changed)
  [...diff.added, ...diff.changed].forEach(pkg => {
    const name = 'name' in pkg ? pkg.name : pkg.name; // TS hack
    const license = licenseMap.get(name) || 'UNKNOWN';

    if (policy.license_policy.deny.includes(license)) {
      result.violations.push({
        rule: 'license_denied',
        package: name,
        severity: 'HIGH',
        message: `Denied license detected: ${license}`
      });
    } else if (policy.license_policy.review_required.includes(license) || license === 'UNKNOWN') {
      result.violations.push({
        rule: 'license_review',
        package: name,
        severity: 'HIGH', // Treating UNKNOWN as High Risk for this exercise
        message: `Review required for license: ${license}`
      });
    }
  });

  // Rule 3: Flagged Packages
  [...diff.added, ...diff.changed].forEach(pkg => {
    const name = pkg.name;
    if (policy.package_policy.flagged_packages.includes(name)) {
      result.violations.push({
        rule: 'flagged_package_change',
        package: name,
        severity: 'HIGH',
        message: `Change in flagged sensitive package: ${name}`
      });
    }
  });

  // Rule 4: Major Version Bump
  diff.changed.forEach(pkg => {
    const oldMajor = pkg.oldVersion.split('.')[0];
    const newMajor = pkg.newVersion.split('.')[0];
    if (oldMajor !== newMajor) {
      result.violations.push({
        rule: 'major_version_bump',
        package: pkg.name,
        severity: 'MEDIUM',
        message: `Major version upgrade: ${pkg.oldVersion} -> ${pkg.newVersion}`
      });
    }
  });

  // Determine Final Status
  let maxApprovers = 0;
  result.violations.forEach(v => {
    if (v.severity === 'HIGH') {
      result.requiresApproval = true;
      maxApprovers = Math.max(maxApprovers, 2);
    } else if (v.severity === 'MEDIUM') {
      result.requiresApproval = true;
      maxApprovers = Math.max(maxApprovers, 1);
    }
  });

  result.minApprovers = maxApprovers;
  if (result.requiresApproval) {
    result.status = 'NEEDS_APPROVAL';
  }

  // Write Result
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2));
  console.log(`Policy check result written to ${OUTPUT_PATH}`);
  console.log(`Status: ${result.status}`);
  if (result.violations.length > 0) {
    console.log('Violations found:');
    result.violations.forEach(v => console.log(` - [${v.severity}] ${v.message}`));
  }
}

main();
