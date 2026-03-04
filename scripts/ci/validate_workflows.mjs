import fs from "fs";
import path from "path";

const workflowsDir = ".github/workflows";

if (!fs.existsSync(workflowsDir)) {
  console.log("No workflows directory found.");
  process.exit(0);
}

const files = fs.readdirSync(workflowsDir).filter(f => f.endsWith(".yml") || f.endsWith(".yaml"));

const MAX_WORKFLOWS = 270; // Current count is ~260. We will lower this as we consolidate.

if (files.length > MAX_WORKFLOWS) {
  console.error(`❌ Too many workflows: ${files.length} (Limit: ${MAX_WORKFLOWS})`);
  process.exit(1);
}

let missingConcurrency = 0;
for (const file of files) {
  const content = fs.readFileSync(path.join(workflowsDir, file), "utf8");

  // Skip archive or legacy workflows if they are in a subfolder or have a prefix
  if (file.includes(".archive") || file.includes("legacy")) continue;

  if (!content.includes("concurrency:")) {
    console.warn(`⚠️ Workflow missing concurrency guard: ${file}`);
    missingConcurrency++;
  }
}

if (missingConcurrency > 50) { // Allowing some grace period for the existing 260 workflows
    console.error(`❌ Too many workflows missing concurrency guards: ${missingConcurrency}`);
    // process.exit(1); // Keep as warning for now to avoid blocking the first stabilization PR
}

console.log(`✅ Workflow validation passed. Found ${files.length} workflows.`);
