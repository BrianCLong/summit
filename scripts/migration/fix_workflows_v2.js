const fs = require('fs');
const path = require('path');

const workflowsDir = '.github/workflows';

function fixWorkflow(file) {
    const filePath = path.join(workflowsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Fix pull_request: null
    content = content.replace(/pull_request: null/g, 'pull_request:');

    // 2. Fix Setup pnpm version pinning
    // Remove the whole 'with' block if it only contains 'version'
    content = content.replace(/(- name: (Setup pnpm|Install pnpm)\s+uses: pnpm\/action-setup@[^\n]+\n)\s+with:\n\s+version: [^\n]+/g, '');

    // Also catch cases where version is just there
    content = content.replace(/uses: pnpm\/action-setup@[^\n]+\n\s+with:\n\s+version: [^\n]+/g, (match) => {
        return match.split('\n')[0];
    });

    // 3. Fix quotes in node-version if needed (though not strictly necessary)
    // content = content.replace(/node-version: (\d+)/g, 'node-version: ""');

    // 4. Fix potential "on": null if any
    content = content.replace(/"on": null/g, 'on:');

    fs.writeFileSync(filePath, content);
}

fs.readdirSync(workflowsDir).forEach(file => {
    if (file.endsWith('.yml') || file.endsWith('.yaml')) {
        fixWorkflow(file);
    }
});
