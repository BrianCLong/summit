import { canonicalizePolicy, validatePolicy } from "../../packages/policy-cards/src/index.js";
import fs from "fs";
import path from "path";

// Skeleton drift detector
// In a real implementation, this would fetch the "approved" hash from a registry (e.g., Neo4j, S3, or a file)
// and compare it with the current policy in the repo.

const KNOWN_POLICIES_DIR = process.env.KNOWN_POLICIES_DIR || path.join(process.cwd(), "policies");

async function main() {
    console.log("Starting Policy Drift Detection...");

    if (!fs.existsSync(KNOWN_POLICIES_DIR)) {
        console.log("No policies directory found. Skipping drift check.");
        process.exit(0);
    }

    const files = fs.readdirSync(KNOWN_POLICIES_DIR).filter(f => f.endsWith('.yaml') || f.endsWith('.json'));
    const driftReport: any = { timestamp: new Date().toISOString(), details: [] };
    let hasDrift = false;

    for (const file of files) {
        const filePath = path.join(KNOWN_POLICIES_DIR, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const canonical = canonicalizePolicy(content);
        const res = validatePolicy(canonical); // Gets the hash

        console.log(`Checked ${file}: Hash ${res.hash}`);

        // Simulating drift check:
        // const approvedHash = getApprovedHash(file);
        // if (res.hash !== approvedHash) { hasDrift = true; ... }

        driftReport.details.push({ file, hash: res.hash, status: "CHECKED" });
    }

    // Write drift report
    const artifactDir = process.env.ARTIFACT_DIR || path.join(process.cwd(), "artifacts", "policy");
    if (!fs.existsSync(artifactDir)) {
        fs.mkdirSync(artifactDir, { recursive: true });
    }
    fs.writeFileSync(path.join(artifactDir, "drift_report.json"), JSON.stringify(driftReport, null, 2));

    console.log("Drift check complete.");
    if (hasDrift) {
        console.error("DRIFT DETECTED!");
        process.exit(1);
    }
}

main();
