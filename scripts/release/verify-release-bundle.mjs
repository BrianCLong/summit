import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DIST_DIR = 'dist/release';
const REQUIRED_FILES = ['release-manifest.json', 'release-notes.md', 'SHA256SUMS', 'sbom.cdx.json', 'provenance.json'];

console.log("Verifying Release Bundle...");

let failed = false;

// 1. Check existence
for (const f of REQUIRED_FILES) {
  if (!fs.existsSync(path.join(DIST_DIR, f))) {
    console.error(`FAIL: Missing required file: ${f}`);
    failed = true;
  }
}

if (failed) {
    console.error("Critical files missing. Aborting verification.");
    process.exit(1);
}

// 2. Verify SHA256SUMS
console.log("Verifying Checksums...");
const sumsContent = fs.readFileSync(path.join(DIST_DIR, 'SHA256SUMS'), 'utf8');
const lines = sumsContent.trim().split('\n');
for (const line of lines) {
    const [hash, file] = line.trim().split(/\s+/);
    if (!hash || !file) continue;

    if (!fs.existsSync(path.join(DIST_DIR, file))) {
        console.error(`FAIL: File listed in SHA256SUMS missing: ${file}`);
        failed = true;
        continue;
    }

    const content = fs.readFileSync(path.join(DIST_DIR, file));
    const calculated = crypto.createHash('sha256').update(content).digest('hex');
    if (calculated !== hash) {
        console.error(`FAIL: Checksum mismatch for ${file}. Expected ${hash}, got ${calculated}`);
        failed = true;
    } else {
        // console.log(`OK: ${file}`);
    }
}

// 3. Verify SBOM
console.log("Verifying SBOM...");
try {
    const sbom = JSON.parse(fs.readFileSync(path.join(DIST_DIR, 'sbom.cdx.json'), 'utf8'));
    if (!sbom.bomFormat || sbom.bomFormat !== 'CycloneDX') {
        console.error("FAIL: SBOM bomFormat invalid or missing");
        failed = true;
    }
    if (!sbom.specVersion) {
        console.error("FAIL: SBOM specVersion missing");
        failed = true;
    }
} catch (e) {
    console.error("FAIL: Invalid SBOM JSON", e.message);
    failed = true;
}

// 4. Verify Provenance
console.log("Verifying Provenance...");
try {
    const prov = JSON.parse(fs.readFileSync(path.join(DIST_DIR, 'provenance.json'), 'utf8'));
    if (!prov.tag) { console.error("FAIL: Provenance tag missing"); failed = true; }
    if (!prov.sha) { console.error("FAIL: Provenance sha missing"); failed = true; }
    if (!prov.artifacts || !Array.isArray(prov.artifacts)) { console.error("FAIL: Provenance artifacts missing or invalid"); failed = true; }
} catch (e) {
    console.error("FAIL: Invalid Provenance JSON", e.message);
    failed = true;
}

if (failed) {
    console.error("\nRelease Bundle Verification FAILED");
    process.exit(1);
} else {
    console.log("\nRelease Bundle Verification PASSED");
}
