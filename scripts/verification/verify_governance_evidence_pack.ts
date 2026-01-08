#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import util from 'util';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

const execPromise = util.promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ValidationReport {
    pass: boolean;
    component_statuses: Record<string, 'PASS' | 'FAIL' | 'MISSING' | 'UNKNOWN'>;
    blocking_reasons: string[];
    remediation: string[];
}

async function calculateHash(filePath: string): Promise<string> {
    const fileBuffer = await fs.readFile(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
}

async function verifyChecksums(packDir: string): Promise<boolean> {
    const checksumPath = path.join(packDir, 'hashes', 'checksums.sha256');
    try {
        const content = await fs.readFile(checksumPath, 'utf-8');
        const lines = content.trim().split('\n');
        for (const line of lines) {
            const [expectedHash, relativePath] = line.split('  ');
            if (!expectedHash || !relativePath) continue;

            const fullPath = path.join(packDir, relativePath);
            try {
                const actualHash = await calculateHash(fullPath);
                if (actualHash !== expectedHash) {
                    console.error(`❌ Hash mismatch for ${relativePath}: expected ${expectedHash}, got ${actualHash}`);
                    return false;
                }
            } catch (e) {
                console.error(`❌ File missing or unreadable: ${relativePath}`);
                return false;
            }
        }
        return true;
    } catch (e) {
        console.error(`❌ Checksums file missing or invalid at ${checksumPath}`);
        return false;
    }
}

async function main() {
    const args = process.argv.slice(2);
    const getArg = (name: string) => {
        const index = args.indexOf(name);
        return index !== -1 ? args[index + 1] : null;
    };

    const packPath = getArg('--pack');

    if (!packPath) {
        console.error("Usage: verify_governance_evidence_pack.ts --pack <path_to_unpacked_dir_or_tarball>");
        process.exit(1);
    }

    // If it's a tarball, we might need to unpack it to a temp dir, but for now assuming unpacked dir for simplicity
    // or we handle extraction. The plan says "verifies archive integrity", so likely we should handle tarball.
    let targetDir = packPath;
    let isTemp = false;

    if (packPath.endsWith('.tar.gz')) {
        console.error("📦 Unpacking archive for verification...");
        targetDir = path.join(path.dirname(packPath), 'temp_verify_' + Date.now());
        await fs.mkdir(targetDir, { recursive: true });
        await execPromise(`tar -xzf "${packPath}" -C "${targetDir}"`);
        isTemp = true;
    }

    console.error(`🔍 Verifying Governance Evidence Pack at: ${targetDir}`);

    const report: ValidationReport = {
        pass: true,
        component_statuses: {},
        blocking_reasons: [],
        remediation: []
    };

    // 1. Verify Checksums
    if (await verifyChecksums(targetDir)) {
        report.component_statuses['integrity'] = 'PASS';
    } else {
        report.component_statuses['integrity'] = 'FAIL';
        report.pass = false;
        report.blocking_reasons.push('CHECKSUM_MISMATCH');
        report.remediation.push('Download the artifact again or check for tampering.');
    }

    // 2. Verify Release Evidence
    // Check if EVIDENCE_BUNDLE_SUMMARY.json exists
    const releaseSummaryPath = path.join(targetDir, 'release', 'EVIDENCE_BUNDLE_SUMMARY.json');
    try {
        await fs.access(releaseSummaryPath);
        // Could parse and check status
        const summary = JSON.parse(await fs.readFile(releaseSummaryPath, 'utf-8'));
        const sprintStatus = summary.acceptance_criteria?.evidence_bundle_complete;
        if (sprintStatus) {
            report.component_statuses['release_evidence'] = 'PASS';
        } else {
            report.component_statuses['release_evidence'] = 'FAIL';
            report.blocking_reasons.push('RELEASE_EVIDENCE_INCOMPLETE');
        }
    } catch {
        report.component_statuses['release_evidence'] = 'MISSING';
        report.pass = false;
        report.blocking_reasons.push('MISSING_RELEASE_EVIDENCE');
    }

    // 3. Verify Policy Bundle (Existence for now)
    const policyDir = path.join(targetDir, 'policy');
    try {
        const files = await fs.readdir(policyDir);
        if (files.length > 0) {
            report.component_statuses['policy_bundle'] = 'PASS';
        } else {
             report.component_statuses['policy_bundle'] = 'MISSING'; // Empty
             report.pass = false;
             report.blocking_reasons.push('EMPTY_POLICY_BUNDLE');
        }
    } catch {
        report.component_statuses['policy_bundle'] = 'MISSING';
        report.pass = false;
        report.blocking_reasons.push('MISSING_POLICY_BUNDLE');
    }

    // 4. Verify Field Evidence
    const fieldDir = path.join(targetDir, 'field');
    try {
         await fs.access(fieldDir);
         report.component_statuses['field_evidence'] = 'PASS'; // Weak check
    } catch {
        report.component_statuses['field_evidence'] = 'MISSING';
        // Maybe not blocking depending on strictness, but prompt implies unified pack.
        report.pass = false;
        report.blocking_reasons.push('MISSING_FIELD_EVIDENCE');
    }

    // Output JSON report to stdout
    const reportPath = path.join(targetDir, 'verification', 'governance-verify.json');
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Also print to stdout as requested
    console.log(JSON.stringify(report, null, 2));

    if (isTemp) {
        // Cleanup
        await fs.rm(targetDir, { recursive: true, force: true });
    }

    if (!report.pass) {
        process.exit(1);
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
