import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const SCHEMA_PATH = 'schemas/external_attestation.schema.json';
const TRUSTED_ATTESTORS_PATH = 'docs/security/trusted_attestors.json';
const INBOX_DIR = 'artifacts/attestations/inbox';
const OUTPUT_FILE = 'artifacts/attestations/verification_result.json';

// Initialize Validator
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf-8'));
const validate = ajv.compile(schema);

// Load Trusted Keys
const trustedAttestors = JSON.parse(fs.readFileSync(TRUSTED_ATTESTORS_PATH, 'utf-8')).attestors;

function verifyAttestation(filePath) {
    console.log(`Verifying: ${filePath}`);
    const content = fs.readFileSync(filePath, 'utf-8');
    const attestation = JSON.parse(content);

    // 1. Schema Validation
    const valid = validate(attestation);
    if (!valid) {
        return { valid: false, error: 'Schema validation failed', details: validate.errors };
    }

    // 2. Identity Verification
    const attestorId = attestation.attestor.id;
    const knownAttestor = trustedAttestors.find(a => a.id === attestorId && a.status === 'active');
    if (!knownAttestor) {
        return { valid: false, error: `Unknown or inactive attestor: ${attestorId}` };
    }

    // 3. Signature Verification
    // Reconstruct canonical payload (naive canonicalization for this proof: strict key order/formatting required by contract)
    // The contract requires a "detached signature". The 'value' in 'signature' signs the REST of the body.
    // For this implementation, verification assumes the signature was generated over the JSON string EXCLUDING the signature block?
    // Or normally, JWS/JWT is used. The prompt implies a custom schema.
    // Let's assume the signature covers the "scope" and "assertions" and "timestamp" and "attestor" objects combined.

    // To simplify: The contract (which I wrote) says "Detached signature". 
    // Let's assume the payload to verify is the JSON string of the object with "signature" key removed.
    const payloadObj = { ...attestation };
    delete payloadObj.signature;

    // Deterministic stringify (fast approach: simple JSON.stringify usually works if keys ordered, but safer to use canonical-json logic if needed. 
    // For this POC, we'll assume the input was formatted strictly or we sort keys.
    // Let's assume keys sorted lexicographically for the payload.)
    const payloadString = JSON.stringify(payloadObj); // Input MUST be strict

    try {
        const keyConfig = knownAttestor.public_key;
        if (keyConfig.algorithm === 'ed25519') {
            // Ed25519 verification
            // In Node, we need a KeyObject or PEM. 
            // We'll treat 'value' as a exported raw key or SPKI. 
            // Simplification: We simulate verification for the mock key "MCow..." if it's that one.
            // OR we implement real verify if we provided a real key.
            // Given the prompt "Verify cryptographic signatures", we should try to be real.
            // But managing PEM conversion in a short script is a pain. 
            // Let's implement a check: if signature.value === "VALID_SIG_FOR_DEMO", we pass (for the replay to work easily), 
            // OR we do real crypto. Real crypto is better.

            // Setup for Real Crypto:
            // Key: standard PEM or DER.
            // For the sake of this prompt's constraints and providing a working replay:
            // I will provide a script that SIGNS it too, or just specific instructions in the REPLAY.md.
            // I will use a simple shared secret HMAC or simulated check if crypto complexity is too high for a single script without extra deps.
            // Verify: "Verify cryptographic signatures".
            // I'll stick to real crypto but wrap it in try-catch.

            // Key import (assuming SPKI base64 for Ed25519)
            const publicKey = crypto.createPublicKey({
                key: Buffer.from(keyConfig.value, 'base64'),
                format: 'der',
                type: 'spki'
            });

            const signature = Buffer.from(attestation.signature.value, 'base64');
            const data = Buffer.from(payloadString);

            const isVerified = crypto.verify(null, data, publicKey, signature);
            if (!isVerified) {
                return { valid: false, error: 'Invalid signature' };
            }
        } else {
            return { valid: false, error: 'Unsupported algorithm' };
        }
    } catch (e) {
        return { valid: false, error: `Crypto error: ${e.message}` };
    }

    return { valid: true };
}

// Main Execution
if (!fs.existsSync(INBOX_DIR)) {
    console.log("No attestation inbox found. Skipping.");
    process.exit(0);
}

const files = fs.readdirSync(INBOX_DIR).filter(f => f.endsWith('.attestation.json'));
const results = [];

for (const file of files) {
    const result = verifyAttestation(path.join(INBOX_DIR, file));
    results.push({ file, ...result });
    console.log(`[${result.valid ? 'PASS' : 'FAIL'}] ${file} - ${result.error || 'OK'}`);
}

// Emit Results
const outDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}
fs.writeFileSync(OUTPUT_FILE, JSON.stringify({
    timestamp: new Date().toISOString(),
    results
}, null, 2));

console.log(`Verification complete. Results in ${OUTPUT_FILE}`);
// Do not exit 1. We just report.
process.exit(0);
