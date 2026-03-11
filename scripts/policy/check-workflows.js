import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..', '..');
const WORKFLOWS_DIR = path.join(ROOT_DIR, '.github', 'workflows');

function checkWorkflows() {
    let hasErrors = false;

    let filesToCheck = [];

    // Get files from args
    const args = process.argv.slice(2);
    if (args.length > 0) {
        filesToCheck = args.map(f => path.isAbsolute(f) ? f : path.join(ROOT_DIR, f))
            .filter(f => fs.existsSync(f) && (f.endsWith('.yml') || f.endsWith('.yaml')));
    } else {
        if (!fs.existsSync(WORKFLOWS_DIR)) {
            console.error(`Directory not found: ${WORKFLOWS_DIR}`);
            process.exit(1);
        }
        filesToCheck = fs.readdirSync(WORKFLOWS_DIR)
            .filter(file => file.endsWith('.yml') || file.endsWith('.yaml'))
            .map(file => path.join(WORKFLOWS_DIR, file));
    }

    if (filesToCheck.length === 0) {
        console.log('No workflows to check.');
        return;
    }

    for (const filePath of filesToCheck) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const fileName = path.basename(filePath);

        let doc;
        try {
            doc = yaml.load(fileContent);
        } catch (e) {
            console.error(`Failed to parse YAML in ${fileName}: ${e.message}`);
            hasErrors = true;
            continue;
        }

        if (!doc) continue;

        console.log(`Checking ${fileName}...`);

        // Check 1: pull_request_target
        let usesPullRequestTarget = false;
        if (doc.on) {
            if (typeof doc.on === 'string' && doc.on === 'pull_request_target') {
                usesPullRequestTarget = true;
            } else if (Array.isArray(doc.on) && doc.on.includes('pull_request_target')) {
                usesPullRequestTarget = true;
            } else if (typeof doc.on === 'object' && doc.on.pull_request_target !== undefined) {
                usesPullRequestTarget = true;
            }
        }

        if (usesPullRequestTarget) {
            console.error(`  [!] Error: Unsafe pull_request_target trigger found in ${fileName}.`);
            console.error(`      Using pull_request_target allows external contributors to run code with write permissions or access to secrets. This is prohibited by policy.`);
            hasErrors = true;
        }

        // Check 2: Missing permissions
        let hasTopLevelPermissions = !!doc.permissions;
        let missingPermissionsJob = false;

        if (!hasTopLevelPermissions) {
            if (doc.jobs) {
                for (const jobName in doc.jobs) {
                    if (!doc.jobs[jobName].permissions) {
                        missingPermissionsJob = true;
                        break;
                    }
                }
            }
        }

        if (!hasTopLevelPermissions && missingPermissionsJob) {
             console.error(`  [!] Error: Missing explicit token permissions in ${fileName}.`);
             console.error(`      Every workflow or job must explicitly declare its required permissions (e.g. permissions: contents: read).`);
             hasErrors = true;
        }

        // Check 3: Pinned Actions
        if (doc.jobs) {
            for (const jobName in doc.jobs) {
                const job = doc.jobs[jobName];
                if (job.steps && Array.isArray(job.steps)) {
                    for (const step of job.steps) {
                        if (step.uses) {
                            // Check if it's a local action like ./.github/actions/...
                            if (step.uses.startsWith('./')) {
                                continue;
                            }

                            // Check if it's a docker image
                            if (step.uses.startsWith('docker://')) {
                                continue;
                            }

                            // Check if it contains an '@'
                            const parts = step.uses.split('@');
                            if (parts.length !== 2) {
                                console.error(`  [!] Error: Invalid or missing ref in action ${step.uses} in ${fileName}.`);
                                hasErrors = true;
                                continue;
                            }

                            const ref = parts[1];
                            // Check if the ref is a 40 character SHA string
                            if (!/^[0-9a-f]{40}$/i.test(ref)) {
                                console.error(`  [!] Error: Unpinned action found: ${step.uses} in ${fileName}.`);
                                console.error(`      Actions must be pinned to a full 40-character Git SHA to prevent supply chain attacks (e.g., actions/checkout@a5ac7e51b41094c92402da3b24376905380afc29). Found ref: ${ref}`);
                                hasErrors = true;
                            }
                        }
                    }
                }
            }
        }
    }

    if (hasErrors) {
        console.error('\nWorkflow checks failed. Please fix the issues above.');
        process.exit(1);
    } else {
        console.log('\nAll workflow checks passed successfully.');
    }
}

checkWorkflows();
