/**
 * validate_workflows.mjs
 * 
 * Enforces CI governance:
 * 1. Max workflows in .github/workflows must be <= 25.
 * 2. Every workflow must contain a 'concurrency' guard.
 */
import fs from "fs";
import path from "path";

const workflowsDir = ".github/workflows";
const MAX_WORKFLOWS = 25;

const files = fs.readdirSync(workflowsDir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));

console.log(`Auditing ${files.length} workflows...`);

let errors = 0;

if (files.length > MAX_WORKFLOWS) {
    console.error(`❌ Too many workflows: ${files.length} (Max: ${MAX_WORKFLOWS})`);
    errors++;
}

for (const file of files) {
    const content = fs.readFileSync(path.join(workflowsDir, file), "utf8");

    if (!content.includes("concurrency:")) {
        console.error(`❌ Workflow missing concurrency guard: ${file}`);
        errors++;
    }
}

if (errors > 0) {
    console.error(`\nFound ${errors} workflow governance violations.`);
    process.exit(1);
} else {
    console.log("✅ Workflow validation passed.");
}
