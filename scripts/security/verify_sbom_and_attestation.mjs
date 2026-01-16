import fs from 'fs';
import path from 'path';

const SHA = process.env.GITHUB_SHA || process.argv[2];
if (!SHA) {
  console.error("Usage: node verify_sbom_and_attestation.mjs <sha>");
  process.exit(1);
}

const ARTIFACTS_ROOT = process.env.ARTIFACTS_DIR || 'artifacts';
const SBOM_DIR = path.join(ARTIFACTS_ROOT, 'sbom', SHA);
const PROVENANCE_DIR = path.join(ARTIFACTS_ROOT, 'provenance', SHA);

const SBOM_FILE = path.join(SBOM_DIR, 'sbom.json');
const ATTESTATION_FILE = path.join(PROVENANCE_DIR, 'attestation.json');

let success = true;

// Verify SBOM
if (fs.existsSync(SBOM_FILE)) {
    console.log(`✅ SBOM found: ${SBOM_FILE}`);
    // Basic schema check could go here
    try {
        const sbom = JSON.parse(fs.readFileSync(SBOM_FILE, 'utf-8'));
        if (!sbom.bomFormat || !sbom.specVersion) {
             console.error(`❌ SBOM invalid format`);
             success = false;
        }
    } catch (e) {
        console.error(`❌ SBOM malformed: ${e.message}`);
        success = false;
    }
} else {
    console.error(`❌ SBOM missing at ${SBOM_FILE}`);
    success = false;
}

// Verify Attestation
if (fs.existsSync(ATTESTATION_FILE)) {
    console.log(`✅ Provenance Attestation found: ${ATTESTATION_FILE}`);
    // Check for SLSA predicate
    try {
        const attestation = JSON.parse(fs.readFileSync(ATTESTATION_FILE, 'utf-8'));
        // Support bundle or single
        const statement = Array.isArray(attestation) ? attestation[0] : attestation;
        if (statement.predicateType !== 'https://slsa.dev/provenance/v0.2' &&
            statement.predicateType !== 'https://slsa.dev/provenance/v1') {
             console.warn(`⚠️ Attestation predicate type unusual: ${statement.predicateType}`);
        }
    } catch (e) {
        console.error(`❌ Attestation malformed: ${e.message}`);
        success = false;
    }
} else {
    console.error(`❌ Provenance Attestation missing at ${ATTESTATION_FILE}`);
    success = false;
}

if (!success) {
    process.exit(1);
}
console.log("Verification Passed");
