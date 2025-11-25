#!/usr/bin/env npx tsx
/**
 * P30: License Compliance Checker
 * Validates package licenses against organizational policy
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '../..');

interface LicensePolicy {
  allowed: string[];
  forbidden: string[];
  requireApproval: string[];
  exceptions: LicenseException[];
}

interface LicenseException {
  package: string;
  license: string;
  reason: string;
  approvedBy: string;
  approvedDate: string;
  expiresDate?: string;
}

interface PackageLicense {
  name: string;
  version: string;
  license: string;
  repository?: string;
  publisher?: string;
  path: string;
}

interface ComplianceResult {
  passed: boolean;
  packages: {
    allowed: PackageLicense[];
    forbidden: PackageLicense[];
    requireApproval: PackageLicense[];
    unknown: PackageLicense[];
    excepted: PackageLicense[];
  };
  summary: {
    total: number;
    allowed: number;
    forbidden: number;
    requireApproval: number;
    unknown: number;
    excepted: number;
  };
}

const DEFAULT_POLICY: LicensePolicy = {
  allowed: [
    'MIT',
    'ISC',
    'BSD-2-Clause',
    'BSD-3-Clause',
    'Apache-2.0',
    '0BSD',
    'CC0-1.0',
    'Unlicense',
    'CC-BY-4.0',
    'CC-BY-3.0',
    'Python-2.0',
    'BlueOak-1.0.0',
    'MIT-0',
    'Zlib',
    'WTFPL',
    'Public Domain',
    'MPL-2.0', // With linking exception typically
  ],
  forbidden: [
    'GPL-2.0',
    'GPL-2.0-only',
    'GPL-3.0',
    'GPL-3.0-only',
    'AGPL-3.0',
    'AGPL-3.0-only',
    'LGPL-2.0',
    'LGPL-2.1',
    'LGPL-3.0',
    'SSPL-1.0',
    'BUSL-1.1',
    'Elastic-2.0',
    'Commons Clause',
  ],
  requireApproval: [
    'LGPL-2.0-only',
    'LGPL-2.1-only',
    'LGPL-3.0-only',
    'EPL-1.0',
    'EPL-2.0',
    'CDDL-1.0',
    'CDDL-1.1',
    'Artistic-2.0',
  ],
  exceptions: [],
};

function loadPolicy(): LicensePolicy {
  const policyPath = join(ROOT_DIR, '.license-policy.json');
  if (existsSync(policyPath)) {
    const policy = JSON.parse(readFileSync(policyPath, 'utf-8'));
    return {
      ...DEFAULT_POLICY,
      ...policy,
      allowed: [...DEFAULT_POLICY.allowed, ...(policy.allowed || [])],
      forbidden: [...DEFAULT_POLICY.forbidden, ...(policy.forbidden || [])],
      exceptions: policy.exceptions || [],
    };
  }
  return DEFAULT_POLICY;
}

function getPackageLicenses(): PackageLicense[] {
  console.log('Collecting package licenses...');

  const result = spawnSync('npx', ['license-checker', '--json', '--production'], {
    cwd: ROOT_DIR,
    encoding: 'utf-8',
    maxBuffer: 50 * 1024 * 1024,
  });

  const packages: PackageLicense[] = [];

  try {
    const data = JSON.parse(result.stdout || '{}');

    for (const [pkgKey, info] of Object.entries(data as Record<string, unknown>)) {
      const pkgInfo = info as {
        licenses?: string;
        repository?: string;
        publisher?: string;
        path?: string;
      };

      const [name, version] = pkgKey.split('@').reduce<[string, string]>(
        (acc, part, idx, arr) => {
          if (idx === arr.length - 1) {
            acc[1] = part;
          } else {
            acc[0] = acc[0] ? `${acc[0]}@${part}` : part;
          }
          return acc;
        },
        ['', '']
      );

      packages.push({
        name,
        version,
        license: pkgInfo.licenses || 'UNKNOWN',
        repository: pkgInfo.repository,
        publisher: pkgInfo.publisher,
        path: pkgInfo.path || '',
      });
    }
  } catch (error) {
    console.error('Error parsing license data:', error);
  }

  return packages;
}

function normalizeLicense(license: string): string[] {
  // Handle SPDX expressions like "MIT OR Apache-2.0"
  if (license.includes(' OR ')) {
    return license.split(' OR ').map((l) => l.trim());
  }
  if (license.includes(' AND ')) {
    return license.split(' AND ').map((l) => l.trim());
  }
  // Handle parenthetical expressions
  if (license.startsWith('(') && license.endsWith(')')) {
    return normalizeLicense(license.slice(1, -1));
  }
  return [license];
}

function checkException(pkg: PackageLicense, exceptions: LicenseException[]): boolean {
  return exceptions.some((exc) => {
    const packageMatch =
      exc.package === pkg.name || exc.package === `${pkg.name}@${pkg.version}`;
    const licenseMatch = exc.license === '*' || exc.license === pkg.license;

    if (packageMatch && licenseMatch) {
      // Check if exception is expired
      if (exc.expiresDate) {
        const expires = new Date(exc.expiresDate);
        if (expires < new Date()) {
          return false;
        }
      }
      return true;
    }
    return false;
  });
}

function classifyLicense(
  license: string,
  policy: LicensePolicy
): 'allowed' | 'forbidden' | 'requireApproval' | 'unknown' {
  const normalizedLicenses = normalizeLicense(license);

  // If any license variant is allowed, consider it allowed
  for (const lic of normalizedLicenses) {
    if (policy.allowed.some((a) => a.toLowerCase() === lic.toLowerCase())) {
      return 'allowed';
    }
  }

  // Check if forbidden
  for (const lic of normalizedLicenses) {
    if (policy.forbidden.some((f) => f.toLowerCase() === lic.toLowerCase())) {
      return 'forbidden';
    }
  }

  // Check if requires approval
  for (const lic of normalizedLicenses) {
    if (policy.requireApproval.some((r) => r.toLowerCase() === lic.toLowerCase())) {
      return 'requireApproval';
    }
  }

  return 'unknown';
}

function checkCompliance(packages: PackageLicense[], policy: LicensePolicy): ComplianceResult {
  const result: ComplianceResult = {
    passed: true,
    packages: {
      allowed: [],
      forbidden: [],
      requireApproval: [],
      unknown: [],
      excepted: [],
    },
    summary: {
      total: packages.length,
      allowed: 0,
      forbidden: 0,
      requireApproval: 0,
      unknown: 0,
      excepted: 0,
    },
  };

  for (const pkg of packages) {
    // Check exceptions first
    if (checkException(pkg, policy.exceptions)) {
      result.packages.excepted.push(pkg);
      result.summary.excepted++;
      continue;
    }

    const classification = classifyLicense(pkg.license, policy);

    switch (classification) {
      case 'allowed':
        result.packages.allowed.push(pkg);
        result.summary.allowed++;
        break;
      case 'forbidden':
        result.packages.forbidden.push(pkg);
        result.summary.forbidden++;
        result.passed = false;
        break;
      case 'requireApproval':
        result.packages.requireApproval.push(pkg);
        result.summary.requireApproval++;
        result.passed = false;
        break;
      default:
        result.packages.unknown.push(pkg);
        result.summary.unknown++;
        // Unknown licenses don't fail by default, but should be reviewed
    }
  }

  return result;
}

function generateReport(result: ComplianceResult, format: 'console' | 'json' | 'markdown'): string {
  if (format === 'json') {
    return JSON.stringify(result, null, 2);
  }

  if (format === 'markdown') {
    const lines: string[] = [
      '# License Compliance Report',
      '',
      `**Status:** ${result.passed ? '✅ PASSED' : '❌ FAILED'}`,
      `**Generated:** ${new Date().toISOString()}`,
      '',
      '## Summary',
      '',
      '| Category | Count |',
      '|----------|-------|',
      `| Total Packages | ${result.summary.total} |`,
      `| Allowed | ${result.summary.allowed} |`,
      `| Forbidden | ${result.summary.forbidden} |`,
      `| Require Approval | ${result.summary.requireApproval} |`,
      `| Unknown | ${result.summary.unknown} |`,
      `| Excepted | ${result.summary.excepted} |`,
      '',
    ];

    if (result.packages.forbidden.length > 0) {
      lines.push('## Forbidden Licenses');
      lines.push('');
      lines.push('| Package | Version | License |');
      lines.push('|---------|---------|---------|');
      for (const pkg of result.packages.forbidden) {
        lines.push(`| ${pkg.name} | ${pkg.version} | ${pkg.license} |`);
      }
      lines.push('');
    }

    if (result.packages.requireApproval.length > 0) {
      lines.push('## Requires Approval');
      lines.push('');
      lines.push('| Package | Version | License |');
      lines.push('|---------|---------|---------|');
      for (const pkg of result.packages.requireApproval) {
        lines.push(`| ${pkg.name} | ${pkg.version} | ${pkg.license} |`);
      }
      lines.push('');
    }

    if (result.packages.unknown.length > 0) {
      lines.push('## Unknown Licenses');
      lines.push('');
      lines.push('| Package | Version | License |');
      lines.push('|---------|---------|---------|');
      for (const pkg of result.packages.unknown) {
        lines.push(`| ${pkg.name} | ${pkg.version} | ${pkg.license} |`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  // Console format
  const lines: string[] = [
    '',
    '========================================',
    '     LICENSE COMPLIANCE REPORT',
    '========================================',
    '',
    `Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`,
    '',
    '--- Summary ---',
    `  Total Packages: ${result.summary.total}`,
    `  Allowed: ${result.summary.allowed}`,
    `  Forbidden: ${result.summary.forbidden}`,
    `  Require Approval: ${result.summary.requireApproval}`,
    `  Unknown: ${result.summary.unknown}`,
    `  Excepted: ${result.summary.excepted}`,
    '',
  ];

  if (result.packages.forbidden.length > 0) {
    lines.push('--- Forbidden Licenses ---');
    for (const pkg of result.packages.forbidden) {
      lines.push(`  ❌ ${pkg.name}@${pkg.version} (${pkg.license})`);
    }
    lines.push('');
  }

  if (result.packages.requireApproval.length > 0) {
    lines.push('--- Requires Approval ---');
    for (const pkg of result.packages.requireApproval) {
      lines.push(`  ⚠️  ${pkg.name}@${pkg.version} (${pkg.license})`);
    }
    lines.push('');
  }

  if (result.packages.unknown.length > 0 && result.packages.unknown.length <= 20) {
    lines.push('--- Unknown Licenses ---');
    for (const pkg of result.packages.unknown) {
      lines.push(`  ❓ ${pkg.name}@${pkg.version} (${pkg.license})`);
    }
    lines.push('');
  } else if (result.packages.unknown.length > 20) {
    lines.push(`--- Unknown Licenses (${result.packages.unknown.length} packages) ---`);
    lines.push('  Run with --json or --markdown for full list');
    lines.push('');
  }

  lines.push('========================================');
  lines.push('');

  return lines.join('\n');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let format: 'console' | 'json' | 'markdown' = 'console';
  let outputPath: string | null = null;
  let strict = false;

  if (args.includes('--json')) format = 'json';
  if (args.includes('--markdown')) format = 'markdown';
  if (args.includes('--strict')) strict = true;

  const outputIndex = args.indexOf('--output');
  if (outputIndex !== -1 && args[outputIndex + 1]) {
    outputPath = args[outputIndex + 1];
  }

  // Load policy
  const policy = loadPolicy();

  // Get all package licenses
  const packages = getPackageLicenses();
  console.log(`Found ${packages.length} packages to check`);

  // Check compliance
  const result = checkCompliance(packages, policy);

  // In strict mode, unknown licenses also fail
  if (strict && result.packages.unknown.length > 0) {
    result.passed = false;
  }

  // Generate report
  const report = generateReport(result, format);

  if (outputPath) {
    writeFileSync(outputPath, report);
    console.log(`Report written to: ${outputPath}`);
  } else {
    console.log(report);
  }

  // Exit with error if compliance failed
  if (!result.passed) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('License check failed:', error);
  process.exit(1);
});
