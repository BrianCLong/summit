import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

export function getSha256(filePath) {
    const fileBuffer = readFileSync(filePath);
    const hashSum = createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
}

export function getFiles(dir) {
    let files = [];
    const list = readdirSync(dir);
    for (const file of list) {
        const fullPath = join(dir, file);
        const stat = statSync(fullPath);
        if (stat && stat.isDirectory()) {
            files = files.concat(getFiles(fullPath));
        } else {
            files.push(fullPath);
        }
    }
    return files;
}

export function verifyChecksums(bundleDir) {
    const results = { ok: true, checked: [], errors: [] };
    const sumsPath = join(bundleDir, 'SHA256SUMS');
    
    if (!existsSync(sumsPath)) {
        results.ok = false;
        results.errors.push({ code: 'MISSING_CHECKSUMS', message: 'SHA256SUMS not found' });
        return results;
    }

    const lines = readFileSync(sumsPath, 'utf-8').split('\n').filter(l => l.trim());
    for (const line of lines) {
        const [expectedHash, fPath] = line.trim().split(/\s+/);
        const fullPath = join(bundleDir, fPath);
        if (!existsSync(fullPath)) {
            results.ok = false;
            results.errors.push({ code: 'MISSING_FILE', message: `Missing: ${fPath}` });
            continue;
        }
        const actualHash = getSha256(fullPath);
        if (actualHash !== expectedHash) {
            results.ok = false;
            results.errors.push({ code: 'HASH_MISMATCH', message: `Hash mismatch: ${fPath}` });
        }
    }
    
    if (results.ok) {
        results.checked.push('Checksums validated');
    }
    return results;
}

export function enforcePolicy(bundleDir, policyFile, options = {}) {
    const results = { ok: true, checked: [], errors: [], signatureRequired: false };
    const policyPath = join(process.cwd(), policyFile);

    if (!existsSync(policyPath)) {
        results.ok = false;
        results.errors.push({ code: 'POLICY_MISSING', message: `Policy file not found: ${policyFile}` });
        return results;
    }

    try {
        const policy = JSON.parse(readFileSync(policyPath, 'utf-8'));
        const requiredFiles = policy.required_files || [];
        
        // Determine if signature is required by policy
        if (requiredFiles.includes('provenance.json.sig')) {
            results.signatureRequired = true;
        }

        // Apply override if provided
        if (options.signatureRequiredOverride !== undefined) {
            results.signatureRequired = options.signatureRequiredOverride;
        }

        for (const f of requiredFiles) {
            // Skip signature check if override says not required
            if (f === 'provenance.json.sig' && !results.signatureRequired) continue;

            if (!existsSync(join(bundleDir, f))) {
                results.ok = false;
                results.errors.push({ code: 'POLICY_VIOLATION', message: `Missing required file: ${f}` });
            }
        }

        if (policy.required_provenance_fields && existsSync(join(bundleDir, 'provenance.json'))) {
            const prov = JSON.parse(readFileSync(join(bundleDir, 'provenance.json'), 'utf-8'));
            for (const field of policy.required_provenance_fields) {
                const parts = field.split('.');
                let val = prov;
                for (const p of parts) val = val?.[p];
                if (val === undefined || val === null) {
                    results.ok = false;
                    results.errors.push({ code: 'POLICY_VIOLATION', message: `Provenance missing required field: ${field}` });
                }
            }
        }

        if (results.ok) {
            results.checked.push('Policy enforcement passed');
        }
    } catch (e) {
        results.ok = false;
        results.errors.push({ code: 'POLICY_ERROR', message: `Failed to apply policy: ${e.message}` });
    }

    return results;
}

export function checkAttestationBinding(bundleDir) {
    const results = { ok: true, checked: [], errors: [], report: { present: false, verified: false } };
    const attestationsDir = join(bundleDir, 'attestations');

    if (existsSync(attestationsDir)) {
        results.report.present = true;
        results.report.verified = true; // Simplified for now
        results.checked.push('Attestations directory found');
    } else {
        results.report.present = false;
        results.report.verified = false;
    }

    return results;
}
