import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import { fileURLToPath } from 'url';

const execPromise = util.promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WORK_DIR = path.join(__dirname, 'temp_test_governance_' + Date.now());

test('Governance Pack: Determinism and Tamper Detection', async (t) => {

    // Setup
    await fs.mkdir(WORK_DIR, { recursive: true });

    // Create mock inputs
    const releaseDir = path.join(WORK_DIR, 'mock-release');
    await fs.mkdir(releaseDir, { recursive: true });
    await fs.writeFile(path.join(releaseDir, 'EVIDENCE_BUNDLE_SUMMARY.json'), JSON.stringify({ acceptance_criteria: { evidence_bundle_complete: true } }));

    const policyDir = path.join(WORK_DIR, 'mock-policy');
    await fs.mkdir(policyDir, { recursive: true });
    await fs.writeFile(path.join(policyDir, 'policy.rego'), 'package main');

    const fieldDir = path.join(WORK_DIR, 'mock-field');
    await fs.mkdir(fieldDir, { recursive: true });
    await fs.writeFile(path.join(fieldDir, 'README.md'), '# Field Mode');

    const outputDir = path.join(WORK_DIR, 'output');

    // Helper to run builder
    const runBuilder = async (id: string) => {
        // Enforce deterministic date
        const env = { ...process.env, SOURCE_DATE_EPOCH: '1700000000' };

        const cmd = `npx tsx scripts/ci/build_governance_evidence_pack.ts --id ${id} \
            --release-evidence ${releaseDir} \
            --field-evidence ${fieldDir} \
            --policy-bundle ${policyDir} \
            --output-dir ${outputDir}`;
        await execPromise(cmd, { env });
        return path.join(outputDir, id);
    };

    const runVerifier = async (packDir: string) => {
        const cmd = `npx tsx scripts/verification/verify_governance_evidence_pack.ts --pack ${packDir}`;
        try {
            const { stdout } = await execPromise(cmd);
            return JSON.parse(stdout);
        } catch (e: any) {
            // Check if stdout exists on the error object
            if (e.stdout && typeof e.stdout === 'string') {
                try {
                    // The script prints JSON to stdout, but might also have logs.
                    // We need to find the JSON part.
                    // Or we can rely on the file output which is more reliable.
                    return JSON.parse(e.stdout);
                } catch {
                     // Try reading the file output
                     const reportPath = path.join(packDir, 'verification', 'governance-verify.json');
                     try {
                        const fileContent = await fs.readFile(reportPath, 'utf-8');
                        return JSON.parse(fileContent);
                     } catch {
                        // ignore
                     }
                }
            }
             // Try reading the file output as fallback even if e.stdout is missing/unparseable
             const reportPath = path.join(packDir, 'verification', 'governance-verify.json');
             try {
                const fileContent = await fs.readFile(reportPath, 'utf-8');
                return JSON.parse(fileContent);
             } catch {
                console.error('Verifier failed and could not read report file:', e.stderr);
                throw e;
             }
        }
    };

    await t.test('Builds a valid pack', async () => {
        const packDir = await runBuilder('test-run-1');
        const report = await runVerifier(packDir);
        assert.strictEqual(report.pass, true);
        assert.strictEqual(report.component_statuses.release_evidence, 'PASS');
    });

    await t.test('Tamper detection: Modify a file', async () => {
        const packDir = await runBuilder('test-run-2');

        // Tamper with a file
        const fileToTamper = path.join(packDir, 'policy', 'policy.rego');
        await fs.writeFile(fileToTamper, 'package main\n# tampered');

        // runVerifier returns report object even on failure (if it can read it), or throws if completely broken
        let report;
        try {
            report = await runVerifier(packDir);
        } catch (e: any) {
            // If it threw, verify if we can recover report from stdout manually here or fail
            assert.fail('Verifier crashed instead of reporting failure: ' + e.message);
        }

        assert.strictEqual(report.pass, false, 'Report should indicate failure');
        assert.strictEqual(report.component_statuses.integrity, 'FAIL', 'Integrity check should fail');
    });

    await t.test('Determinism: Rebuild yields identical checksums', async () => {
        const id = 'test-run-3';
        const packDir1 = await runBuilder(id);
        const checksums1 = await fs.readFile(path.join(packDir1, 'hashes', 'checksums.sha256'), 'utf-8');
        const indexJson1 = await fs.readFile(path.join(packDir1, 'index.json'), 'utf-8');

        // Wait a second to ensure timestamps might change if we weren't being careful
        await new Promise(r => setTimeout(r, 1500));

        const packDir2 = await runBuilder(id);
        const checksums2 = await fs.readFile(path.join(packDir2, 'hashes', 'checksums.sha256'), 'utf-8');
        const indexJson2 = await fs.readFile(path.join(packDir2, 'index.json'), 'utf-8');

        if (checksums1 !== checksums2) {
            console.error('Diffs in index.json:', indexJson1 === indexJson2 ? 'None' : 'Yes');
            if (indexJson1 !== indexJson2) {
                console.error('Run 1:', indexJson1);
                console.error('Run 2:', indexJson2);
            }
        }

        assert.strictEqual(checksums1, checksums2);
    });

    // Cleanup
    await fs.rm(WORK_DIR, { recursive: true, force: true });
});
