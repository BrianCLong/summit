#!/usr/bin/env npx tsx
"use strict";
/**
 * P30: License Compliance Checker
 * Validates package licenses against organizational policy
 */
Object.defineProperty(exports, "__esModule", { value: true });
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_url_1 = require("node:url");
const __dirname = (0, node_path_1.dirname)((0, node_url_1.fileURLToPath)(import.meta.url));
const ROOT_DIR = (0, node_path_1.join)(__dirname, '../..');
const DEFAULT_POLICY = {
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
function loadPolicy() {
    const policyPath = (0, node_path_1.join)(ROOT_DIR, '.license-policy.json');
    if ((0, node_fs_1.existsSync)(policyPath)) {
        const policy = JSON.parse((0, node_fs_1.readFileSync)(policyPath, 'utf-8'));
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
function getPackageLicenses() {
    console.log('Collecting package licenses...');
    const result = (0, node_child_process_1.spawnSync)('npx', ['license-checker', '--json', '--production'], {
        cwd: ROOT_DIR,
        encoding: 'utf-8',
        maxBuffer: 50 * 1024 * 1024,
    });
    const packages = [];
    try {
        const data = JSON.parse(result.stdout || '{}');
        for (const [pkgKey, info] of Object.entries(data)) {
            const pkgInfo = info;
            const [name, version] = pkgKey.split('@').reduce((acc, part, idx, arr) => {
                if (idx === arr.length - 1) {
                    acc[1] = part;
                }
                else {
                    acc[0] = acc[0] ? `${acc[0]}@${part}` : part;
                }
                return acc;
            }, ['', '']);
            packages.push({
                name,
                version,
                license: pkgInfo.licenses || 'UNKNOWN',
                repository: pkgInfo.repository,
                publisher: pkgInfo.publisher,
                path: pkgInfo.path || '',
            });
        }
    }
    catch (error) {
        console.error('Error parsing license data:', error);
    }
    return packages;
}
function normalizeLicense(license) {
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
function checkException(pkg, exceptions) {
    return exceptions.some((exc) => {
        const packageMatch = exc.package === pkg.name || exc.package === `${pkg.name}@${pkg.version}`;
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
function classifyLicense(license, policy) {
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
function checkCompliance(packages, policy) {
    const result = {
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
function generateReport(result, format) {
    if (format === 'json') {
        return JSON.stringify(result, null, 2);
    }
    if (format === 'markdown') {
        const lines = [
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
    const lines = [
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
    }
    else if (result.packages.unknown.length > 20) {
        lines.push(`--- Unknown Licenses (${result.packages.unknown.length} packages) ---`);
        lines.push('  Run with --json or --markdown for full list');
        lines.push('');
    }
    lines.push('========================================');
    lines.push('');
    return lines.join('\n');
}
async function main() {
    const args = process.argv.slice(2);
    let format = 'console';
    let outputPath = null;
    let strict = false;
    if (args.includes('--json'))
        format = 'json';
    if (args.includes('--markdown'))
        format = 'markdown';
    if (args.includes('--strict'))
        strict = true;
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
        (0, node_fs_1.writeFileSync)(outputPath, report);
        console.log(`Report written to: ${outputPath}`);
    }
    else {
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
