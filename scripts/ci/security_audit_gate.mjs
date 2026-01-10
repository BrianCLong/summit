/**
 * CI Security Audit Gate
 * 
 * Wraps `pnpm audit` to enforce security thresholds in CI.
 * Fails if any Critical or High vulnerabilities are found in production dependencies.
 * 
 * Usage: node scripts/ci/security_audit_gate.mjs
 */

import { spawn } from 'child_process';
import fs from 'fs';

const SEVERITY_ORDER = ['critical', 'high', 'moderate', 'low', 'info'];
const FAILURE_THRESHOLD = 'high'; // Fail on 'high' or 'critical'

function runAudit() {
    return new Promise((resolve, reject) => {
        console.log('🛡️  Running pnpm audit (production dependencies)...');

        const audit = spawn('pnpm', ['audit', '--prod', '--json', '--audit-level=high'], {
            maxBuffer: 10 * 1024 * 1024, // 10MB buffer
            shell: true
        });

        let stdout = '';
        let stderr = '';

        audit.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        audit.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        audit.on('close', (code) => {
            // pnpm audit returns non-zero exit code if vulnerabilities are found,
            // but we need to parse the JSON to determine if they meet our specific criteria
            // or if it was a distinct error (like network issue).
            resolve({ code, stdout, stderr });
        });

        audit.on('error', (err) => {
            reject(err);
        });
    });
}

async function main() {
    try {
        const { code, stdout, stderr } = await runAudit();

        // Check for JSON parsing errors (e.g. if pnpm outputs non-JSON text due to error)
        let report;
        try {
            report = JSON.parse(stdout);
        } catch (e) {
            if (stderr) {
                console.error('❌ pnpm audit failed with stderr:');
                console.error(stderr);
            }
            console.error('❌ Failed to parse pnpm audit JSON output.');
            console.error('Stdout snippet:', stdout.slice(0, 500));
            process.exit(1);
        }

        if (report.error) {
            console.error('❌ pnpm audit returned an error:', report.error.summary);
            process.exit(1);
        }

        // Process vulnerabilities
        const vulns = report.advisories || {}; // pnpm audit json format varies, standard is usually object of advisories or 'advisories' key
        // For pnpm v6+ / v7+, structure might be different. Let's handle standard `pnpm audit --json` output (v7+ usually has 'advisories' object or just root object)

        // Normalize pnpm audit output (it can be an object where keys are advisory IDs)
        const advisories = Object.values(vulns);
        const summary = report.metadata?.vulnerabilities || {};

        console.log('\n📊 Vulnerability Summary:');
        console.table(summary);

        const violations = advisories.filter(adv => {
            const severityIndex = SEVERITY_ORDER.indexOf(adv.severity);
            const thresholdIndex = SEVERITY_ORDER.indexOf(FAILURE_THRESHOLD);
            return severityIndex <= thresholdIndex && severityIndex !== -1;
        });

        if (violations.length > 0) {
            console.error(`\n🚫 CI GATE FAILED: Found ${violations.length} ${FAILURE_THRESHOLD}+ severity vulnerabilities.\n`);

            violations.forEach(v => {
                console.error(`[${v.severity.toUpperCase()}] ${v.title}`);
                console.error(`   Package: ${v.module_name} (${v.vulnerable_versions})`);
                console.error(`   Patched in: ${v.patched_versions}`);
                console.error(`   Path: ${v.findings?.[0]?.paths?.[0] || 'N/A'}`);
                console.error(`   More info: ${v.url}`);
                console.error('---');
            });

            process.exit(1);
        } else {
            console.log(`\n✅ CI GATE PASSED: No ${FAILURE_THRESHOLD}+ vulnerabilities found.`);
            if (code !== 0) {
                console.warn(`(Note: pnpm audit exited with ${code}, but findings were below CI threshold)`);
            }
            process.exit(0);
        }

    } catch (err) {
        console.error('❌ specific execution error:', err);
        process.exit(1);
    }
}

main();
