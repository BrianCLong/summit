#!/usr/bin/env npx tsx
"use strict";
/**
 * P25: Dependency Audit Script
 * Comprehensive dependency auditing with severity filtering and reporting
 */
Object.defineProperty(exports, "__esModule", { value: true });
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_url_1 = require("node:url");
const __dirname = (0, node_path_1.dirname)((0, node_url_1.fileURLToPath)(import.meta.url));
const ROOT_DIR = (0, node_path_1.join)(__dirname, '../..');
const DEFAULT_CONFIG = {
    failOnSeverity: 'high',
    ignoreIds: [],
    ignorePatterns: [],
    checkOutdated: true,
    checkDuplicates: true,
    outputFormat: 'console',
};
function loadConfig() {
    const configPath = (0, node_path_1.join)(ROOT_DIR, '.audit-config.json');
    if ((0, node_fs_1.existsSync)(configPath)) {
        const config = JSON.parse((0, node_fs_1.readFileSync)(configPath, 'utf-8'));
        return { ...DEFAULT_CONFIG, ...config };
    }
    return DEFAULT_CONFIG;
}
function runPnpmAudit() {
    console.log('Running pnpm audit...');
    try {
        const result = (0, node_child_process_1.spawnSync)('pnpm', ['audit', '--json'], {
            cwd: ROOT_DIR,
            encoding: 'utf-8',
            maxBuffer: 10 * 1024 * 1024,
        });
        if (result.error) {
            console.error('Error running pnpm audit:', result.error);
            return [];
        }
        const output = result.stdout || '{}';
        const auditData = JSON.parse(output);
        const vulnerabilities = [];
        if (auditData.advisories) {
            for (const [id, advisory] of Object.entries(auditData.advisories)) {
                const adv = advisory;
                vulnerabilities.push({
                    id,
                    title: adv.title,
                    severity: adv.severity,
                    module: adv.module_name,
                    version: adv.vulnerable_versions,
                    fixAvailable: Boolean(adv.patched_versions),
                    path: adv.findings?.[0]?.paths || [],
                    recommendation: adv.recommendation || 'Update to patched version',
                    cwe: adv.cwe || [],
                    cvss: adv.cvss?.score || null,
                    url: adv.url,
                });
            }
        }
        return vulnerabilities;
    }
    catch (error) {
        console.error('Failed to parse audit output:', error);
        return [];
    }
}
function checkOutdated() {
    console.log('Checking for outdated packages...');
    try {
        const result = (0, node_child_process_1.spawnSync)('pnpm', ['outdated', '--json'], {
            cwd: ROOT_DIR,
            encoding: 'utf-8',
            maxBuffer: 10 * 1024 * 1024,
        });
        const output = result.stdout || '{}';
        const outdatedData = JSON.parse(output);
        const packages = [];
        for (const [name, info] of Object.entries(outdatedData)) {
            const pkg = info;
            packages.push({
                name,
                current: pkg.current,
                wanted: pkg.wanted,
                latest: pkg.latest,
                type: pkg.dependencyType,
                workspace: pkg.workspace,
            });
        }
        return packages;
    }
    catch {
        return [];
    }
}
function findDuplicates() {
    console.log('Checking for duplicate packages...');
    try {
        const result = (0, node_child_process_1.spawnSync)('pnpm', ['why', '--json'], {
            cwd: ROOT_DIR,
            encoding: 'utf-8',
            maxBuffer: 10 * 1024 * 1024,
        });
        // Parse pnpm-lock.yaml to find duplicates
        const lockfilePath = (0, node_path_1.join)(ROOT_DIR, 'pnpm-lock.yaml');
        if (!(0, node_fs_1.existsSync)(lockfilePath)) {
            return [];
        }
        const lockfile = (0, node_fs_1.readFileSync)(lockfilePath, 'utf-8');
        const versionMap = new Map();
        // Simple regex-based parsing for version detection
        const packageRegex = /^\s+'?(@?[^@\s:]+)@([^:'\s]+)'?:/gm;
        let match;
        while ((match = packageRegex.exec(lockfile)) !== null) {
            const [, name, version] = match;
            if (!versionMap.has(name)) {
                versionMap.set(name, new Set());
            }
            versionMap.get(name).add(version);
        }
        const duplicates = [];
        for (const [name, versions] of versionMap) {
            if (versions.size > 1) {
                duplicates.push({
                    name,
                    versions: Array.from(versions),
                    count: versions.size,
                });
            }
        }
        return duplicates.sort((a, b) => b.count - a.count);
    }
    catch {
        return [];
    }
}
function countDependencies() {
    try {
        const result = (0, node_child_process_1.spawnSync)('pnpm', ['list', '--depth=0', '--json'], {
            cwd: ROOT_DIR,
            encoding: 'utf-8',
        });
        const data = JSON.parse(result.stdout || '[]');
        return data.reduce((acc, pkg) => {
            return acc +
                Object.keys(pkg.dependencies || {}).length +
                Object.keys(pkg.devDependencies || {}).length;
        }, 0);
    }
    catch {
        return 0;
    }
}
function filterVulnerabilities(vulnerabilities, config) {
    return vulnerabilities.filter(v => {
        // Check ignored IDs
        if (config.ignoreIds.includes(v.id)) {
            return false;
        }
        // Check ignored patterns
        for (const pattern of config.ignorePatterns) {
            if (new RegExp(pattern).test(v.module)) {
                return false;
            }
        }
        return true;
    });
}
function formatMarkdown(report) {
    const lines = [
        '# Dependency Audit Report',
        '',
        `**Generated:** ${report.timestamp}`,
        `**Total Dependencies:** ${report.totalDependencies}`,
        '',
        '## Vulnerability Summary',
        '',
        '| Severity | Count |',
        '|----------|-------|',
        `| Critical | ${report.summary.critical} |`,
        `| High | ${report.summary.high} |`,
        `| Moderate | ${report.summary.moderate} |`,
        `| Low | ${report.summary.low} |`,
        `| Info | ${report.summary.info} |`,
        `| **Total** | **${report.summary.total}** |`,
        '',
    ];
    if (report.vulnerabilities.length > 0) {
        lines.push('## Vulnerabilities');
        lines.push('');
        for (const v of report.vulnerabilities) {
            const severityBadge = {
                critical: '🔴',
                high: '🟠',
                moderate: '🟡',
                low: '🟢',
                info: '🔵',
            }[v.severity];
            lines.push(`### ${severityBadge} ${v.title}`);
            lines.push('');
            lines.push(`- **Module:** ${v.module}`);
            lines.push(`- **Severity:** ${v.severity.toUpperCase()}`);
            lines.push(`- **Version:** ${v.version}`);
            lines.push(`- **Fix Available:** ${v.fixAvailable ? 'Yes' : 'No'}`);
            if (v.cvss) {
                lines.push(`- **CVSS Score:** ${v.cvss}`);
            }
            lines.push(`- **URL:** ${v.url}`);
            lines.push(`- **Recommendation:** ${v.recommendation}`);
            lines.push('');
        }
    }
    if (report.outdated.length > 0) {
        lines.push('## Outdated Packages');
        lines.push('');
        lines.push('| Package | Current | Wanted | Latest |');
        lines.push('|---------|---------|--------|--------|');
        for (const pkg of report.outdated.slice(0, 50)) {
            lines.push(`| ${pkg.name} | ${pkg.current} | ${pkg.wanted} | ${pkg.latest} |`);
        }
        if (report.outdated.length > 50) {
            lines.push(`| ... and ${report.outdated.length - 50} more | | | |`);
        }
        lines.push('');
    }
    if (report.duplicates.length > 0) {
        lines.push('## Duplicate Packages');
        lines.push('');
        lines.push('| Package | Versions | Count |');
        lines.push('|---------|----------|-------|');
        for (const dup of report.duplicates.slice(0, 30)) {
            lines.push(`| ${dup.name} | ${dup.versions.join(', ')} | ${dup.count} |`);
        }
        lines.push('');
    }
    return lines.join('\n');
}
function formatConsole(report) {
    console.log('\n========================================');
    console.log('       DEPENDENCY AUDIT REPORT');
    console.log('========================================\n');
    console.log(`Timestamp: ${report.timestamp}`);
    console.log(`Total Dependencies: ${report.totalDependencies}`);
    console.log('\n--- Vulnerability Summary ---');
    console.log(`  Critical: ${report.summary.critical}`);
    console.log(`  High:     ${report.summary.high}`);
    console.log(`  Moderate: ${report.summary.moderate}`);
    console.log(`  Low:      ${report.summary.low}`);
    console.log(`  Info:     ${report.summary.info}`);
    console.log(`  Total:    ${report.summary.total}`);
    if (report.vulnerabilities.length > 0) {
        console.log('\n--- Vulnerabilities ---');
        for (const v of report.vulnerabilities) {
            const icon = {
                critical: '🔴',
                high: '🟠',
                moderate: '🟡',
                low: '🟢',
                info: '🔵',
            }[v.severity];
            console.log(`\n${icon} [${v.severity.toUpperCase()}] ${v.title}`);
            console.log(`   Module: ${v.module}@${v.version}`);
            console.log(`   Fix Available: ${v.fixAvailable ? 'Yes' : 'No'}`);
            console.log(`   URL: ${v.url}`);
        }
    }
    if (report.outdated.length > 0) {
        console.log(`\n--- Outdated Packages (${report.outdated.length} total) ---`);
        for (const pkg of report.outdated.slice(0, 10)) {
            console.log(`  ${pkg.name}: ${pkg.current} → ${pkg.latest}`);
        }
        if (report.outdated.length > 10) {
            console.log(`  ... and ${report.outdated.length - 10} more`);
        }
    }
    if (report.duplicates.length > 0) {
        console.log(`\n--- Duplicate Packages (${report.duplicates.length} total) ---`);
        for (const dup of report.duplicates.slice(0, 10)) {
            console.log(`  ${dup.name}: ${dup.count} versions (${dup.versions.join(', ')})`);
        }
    }
    console.log('\n========================================\n');
}
function shouldFail(report, config) {
    const severityOrder = ['info', 'low', 'moderate', 'high', 'critical'];
    const thresholdIndex = severityOrder.indexOf(config.failOnSeverity);
    if (config.failOnSeverity === 'none') {
        return false;
    }
    for (const v of report.vulnerabilities) {
        const vulnIndex = severityOrder.indexOf(v.severity);
        if (vulnIndex >= thresholdIndex) {
            return true;
        }
    }
    return false;
}
async function main() {
    const config = loadConfig();
    // Parse CLI arguments
    const args = process.argv.slice(2);
    if (args.includes('--json')) {
        config.outputFormat = 'json';
    }
    if (args.includes('--markdown')) {
        config.outputFormat = 'markdown';
    }
    if (args.includes('--fail-on-high')) {
        config.failOnSeverity = 'high';
    }
    if (args.includes('--fail-on-critical')) {
        config.failOnSeverity = 'critical';
    }
    const outputIndex = args.indexOf('--output');
    if (outputIndex !== -1 && args[outputIndex + 1]) {
        config.outputPath = args[outputIndex + 1];
    }
    // Run audits
    const vulnerabilities = filterVulnerabilities(runPnpmAudit(), config);
    const outdated = config.checkOutdated ? checkOutdated() : [];
    const duplicates = config.checkDuplicates ? findDuplicates() : [];
    const totalDependencies = countDependencies();
    // Build report
    const report = {
        timestamp: new Date().toISOString(),
        totalDependencies,
        vulnerabilities,
        summary: {
            critical: vulnerabilities.filter(v => v.severity === 'critical').length,
            high: vulnerabilities.filter(v => v.severity === 'high').length,
            moderate: vulnerabilities.filter(v => v.severity === 'moderate').length,
            low: vulnerabilities.filter(v => v.severity === 'low').length,
            info: vulnerabilities.filter(v => v.severity === 'info').length,
            total: vulnerabilities.length,
        },
        outdated,
        duplicates,
    };
    // Output
    switch (config.outputFormat) {
        case 'json':
            const jsonOutput = JSON.stringify(report, null, 2);
            if (config.outputPath) {
                (0, node_fs_1.writeFileSync)(config.outputPath, jsonOutput);
                console.log(`Report written to ${config.outputPath}`);
            }
            else {
                console.log(jsonOutput);
            }
            break;
        case 'markdown':
            const mdOutput = formatMarkdown(report);
            if (config.outputPath) {
                (0, node_fs_1.writeFileSync)(config.outputPath, mdOutput);
                console.log(`Report written to ${config.outputPath}`);
            }
            else {
                console.log(mdOutput);
            }
            break;
        default:
            formatConsole(report);
    }
    // Exit with error if vulnerabilities exceed threshold
    if (shouldFail(report, config)) {
        console.error(`\n❌ Audit failed: Found vulnerabilities at or above ${config.failOnSeverity} severity`);
        process.exit(1);
    }
    console.log('\n✅ Audit passed');
}
main().catch(error => {
    console.error('Audit failed:', error);
    process.exit(1);
});
