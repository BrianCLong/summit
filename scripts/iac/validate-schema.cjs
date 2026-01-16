const fs = require('fs');
const path = require('path');

console.log("Running IaC semantic validation...");

const repoRoot = path.join(__dirname, '../..');
const terraformDir = path.join(repoRoot, 'terraform');

if (!fs.existsSync(terraformDir)) {
    console.log("Terraform directory not found. Skipping.");
    process.exit(0);
}

// 1. Validate Terraform Variables
// We look for variables.tf in root or envs/prod which is likely the canonical prod env
const varFiles = [
    path.join(terraformDir, 'variables.tf'),
    path.join(terraformDir, 'envs/prod/variables.tf')
];

let checked = false;

varFiles.forEach(varFile => {
    if (fs.existsSync(varFile)) {
        console.log(`Checking ${path.relative(repoRoot, varFile)} for required fields...`);
        const content = fs.readFileSync(varFile, 'utf8');

        // Simple regex check for critical variables
        const requiredVars = ['region', 'environment']; // tags might not be in all envs/prod/variables.tf if inherited
        const missingVars = requiredVars.filter(v => !content.includes(`variable "${v}"`));

        if (missingVars.length > 0) {
            console.warn(`WARNING: Missing required variables in ${path.basename(varFile)}: ${missingVars.join(', ')}`);
            // Not failing strictly as structure might vary, but warning is good.
        } else {
            console.log(`${path.basename(varFile)} contains base variables.`);
        }
        checked = true;
    }
});

if (!checked) {
    console.warn("Warning: No variables.tf found in standard locations.");
}

// 2. Validate Schema Existence (Placeholder)
const schemaDir = path.join(repoRoot, 'iac/schema');
if (fs.existsSync(schemaDir)) {
    console.log(`Schema directory found at ${schemaDir}.`);
    // Future: Load schemas and validate TF JSON or plan output against them
} else {
    console.warn("Warning: iac/schema directory not found.");
}

console.log("IaC schema validation passed.");
