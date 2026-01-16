import fs from 'fs';
import path from 'path';

const bundleFile = process.argv[2];

if (!bundleFile) {
    console.error("Usage: tsx verify_handoff_bundle.ts <bundle_file>");
    process.exit(1);
}

if (!fs.existsSync(bundleFile)) {
    console.error(`File not found: ${bundleFile}`);
    process.exit(1);
}

try {
    const bundle = JSON.parse(fs.readFileSync(bundleFile, 'utf-8'));

    // Verify schema compliance (simplified check)
    const requiredFields = ['schema_version', 'agent', 'job_id', 'step_id', 'timestamp', 'inputs_hash', 'prompt_ref', 'outputs', 'evidence'];
    const missing = requiredFields.filter(f => !bundle[f]);

    if (missing.length > 0) {
        console.error(`❌ Invalid bundle schema. Missing fields: ${missing.join(', ')}`);
        process.exit(1);
    }

    console.log(`✅ Bundle ${bundleFile} is valid.`);
} catch (e) {
    console.error(`❌ Failed to parse or verify bundle: ${e.message}`);
    process.exit(1);
}
