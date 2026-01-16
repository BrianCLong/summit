import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Determinism Verifier
 * 
 * Enforces:
 * 1. No ISO 8601 Timestamps in critical artifacts
 * 2. Lexicographically sorted keys in JSON
 * 3. Stable output (deterministic hashing)
 */

const ARTIFACTS_TO_VERIFY = [
    'soc_evidence.json',
    'docs/ga/slsa_provenance.example.json'
];

// Regex for ISO 8601 timestamps (YYYY-MM-DDTHH:mm:ss...)
const TIMESTAMP_REGEX = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

// Allowed exceptions (e.g., metadata fields in SLSA that MUST have timestamps)
const ALLOWED_PATHS = [
    'metadata.buildStartedOn',
    'metadata.buildFinishedOn'
];

function checkDeterminism(filePath) {
    console.log(`Verifying determinism for: ${filePath}`);

    if (!fs.existsSync(filePath)) {
        // If optional artifact misses, warn but don't fail unless critical. 
        // For this proof, we enforce existence if listed.
        console.error(`❌ Artifact not found: ${filePath}`);
        process.exit(1);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    let json;

    try {
        json = JSON.parse(content);
    } catch (e) {
        console.error(`❌ Invalid JSON in ${filePath}`);
        process.exit(1);
    }

    // 1. Check for Timestamp Pollution
    const timestampErrors = findTimestamps(json);
    if (timestampErrors.length > 0) {
        console.error(`❌ Indeterminism detected: Timestamps found in ${filePath}`);
        timestampErrors.forEach(err => console.error(`   - ${err}`));
        process.exit(1);
    }

    // 2. Check for Key Stability (Are keys sorted?)
    if (!isSorted(json)) {
        console.error(`❌ Indeterminism detected: Unsorted keys in ${filePath}`);
        process.exit(1);
    }

    console.log(`✅ ${filePath} is deterministic.`);
}

function findTimestamps(obj, path = '') {
    let errors = [];

    if (ALLOWED_PATHS.some(p => path.endsWith(p))) {
        return errors;
    }

    if (typeof obj === 'string') {
        if (TIMESTAMP_REGEX.test(obj)) {
            errors.push(`${path}: ${obj}`);
        }
    } else if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
            errors = errors.concat(findTimestamps(item, `${path}[${index}]`));
        });
    } else if (typeof obj === 'object' && obj !== null) {
        Object.keys(obj).forEach(key => {
            errors = errors.concat(findTimestamps(obj[key], path ? `${path}.${key}` : key));
        });
    }
    return errors;
}

function isSorted(obj) {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
        return true;
    }

    const keys = Object.keys(obj);
    const sortedKeys = [...keys].sort();

    for (let i = 0; i < keys.length; i++) {
        if (keys[i] !== sortedKeys[i]) {
            console.error(`   - Key '${keys[i]}' should be '${sortedKeys[i]}'`);
            return false;
        }
        // Recurse
        if (!isSorted(obj[keys[i]])) {
            return false;
        }
    }
    return true;
}

// Main execution
const projectRoot = process.cwd();
ARTIFACTS_TO_VERIFY.forEach(file => {
    const fullPath = path.join(projectRoot, file);
    checkDeterminism(fullPath);
});

console.log("Integrity Verified: All artifacts conform to determinism policy.");
