/**
 * CI Script to validate PROV-O JSON-LD artifacts against a minimal profile.
 * Ensures that lineage exports are standards-compliant.
 */

import fs from 'fs';
import { exit } from 'process';

console.log("Starting PROV Profile Validation...");

// In a real scenario, this script would take a path to a generated PROV file.
// For the drop-in, we will define the expected structure and maybe validate a sample or passed file.

const sampleProv = {
    "@context": {
        "prov": "http://www.w3.org/ns/prov#",
        "xsd": "http://www.w3.org/2001/XMLSchema#"
    },
    "@graph": [
        {
            "@id": "urn:ol:run:123",
            "@type": "prov:Activity",
            "prov:startedAtTime": "2023-10-27T10:00:00Z"
        },
        {
            "@id": "urn:ol:dataset:db:table",
            "@type": "prov:Entity",
            "prov:wasGeneratedBy": "urn:ol:run:123"
        }
    ]
};

function validateProv(doc) {
    if (!doc['@graph'] || !Array.isArray(doc['@graph'])) {
        console.error("❌ Invalid PROV JSON-LD: Missing @graph array.");
        return false;
    }

    const hasActivity = doc['@graph'].some(node => node['@type'] === 'prov:Activity');
    const hasEntity = doc['@graph'].some(node => node['@type'] === 'prov:Entity');

    if (!hasActivity) {
        console.warn("⚠️  Warning: No prov:Activity found in the graph.");
    }
    if (!hasEntity) {
        console.warn("⚠️  Warning: No prov:Entity found in the graph.");
    }

    // Check for required timestamps on activities
    const activities = doc['@graph'].filter(node => node['@type'] === 'prov:Activity');
    for (const act of activities) {
        if (!act['prov:startedAtTime'] && !act['prov:endedAtTime']) {
            console.error(`❌ Activity ${act['@id']} missing start/end time.`);
            return false;
        }
    }

    return true;
}

// Check if a file path is provided as an argument
const filePath = process.argv[2];

if (filePath) {
    if (fs.existsSync(filePath)) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const json = JSON.parse(content);
            if (validateProv(json)) {
                console.log(`✅ ${filePath} is valid according to the minimal profile.`);
                exit(0);
            } else {
                console.error(`❌ ${filePath} failed validation.`);
                exit(1);
            }
        } catch (e) {
            console.error(`❌ Error reading or parsing ${filePath}:`, e.message);
            exit(1);
        }
    } else {
        console.error(`❌ File not found: ${filePath}`);
        exit(1);
    }
} else {
    // If no file, just validate the internal sample to prove it works
    console.log("No file provided. Validating internal sample...");
    if (validateProv(sampleProv)) {
        console.log("✅ Internal sample is valid.");
        exit(0);
    } else {
        exit(1);
    }
}
