import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const WORKFLOW_DIR = '.github/workflows';
const MAX_WORKFLOWS = 50; // Radical reduction target

async function validateWorkflows() {
    const files = fs.readdirSync(WORKFLOW_DIR).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));

    console.log(`Auditing ${files.length} workflows...`);

    let errors = 0;

    if (files.length > MAX_WORKFLOWS) {
        console.error(`❌ Too many workflows: ${files.length} (Max: ${MAX_WORKFLOWS})`);
        errors++;
    }

    for (const file of files) {
        const filePath = path.join(WORKFLOW_DIR, file);
        const content = fs.readFileSync(filePath, 'utf8');

        try {
            const doc = yaml.load(content);

            // Check for concurrency guard
            if (!doc.concurrency) {
                console.error(`❌ ${file}: Missing concurrency guard`);
                errors++;
            }

            // Check for path filters on pull_request
            const prTrigger = doc.on?.pull_request;
            if (prTrigger && !prTrigger.paths && !prTrigger.paths_ignore) {
                // Exempt the unified gate itself if needed, but generally we want filters
                if (file !== 'ci-gate.yml' && file !== 'main-validation.yml') {
                    console.error(`❌ ${file}: PR trigger missing path filters`);
                    errors++;
                }
            }

        } catch (e) {
            console.error(`❌ ${file}: Invalid YAML: ${e.message}`);
            errors++;
        }
    }

    if (errors > 0) {
        console.error(`\nFound ${errors} CI governance violations.`);
        process.exit(1);
    } else {
        console.log('✅ CI Architecture validated.');
    }
}

validateWorkflows();
