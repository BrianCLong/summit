const fs = require('fs');
const path = require('path');

const workflowsDir = '.github/workflows';

function fixWorkflow(file) {
    const filePath = path.join(workflowsDir, file);
    let lines = fs.readFileSync(filePath, 'utf8').split('\n');
    let newLines = [];

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // 1. Fix pull_request: null
        line = line.replace(/pull_request: null/g, 'pull_request:');
        line = line.replace(/"on": null/g, 'on:');

        // 2. Fix pnpm/action-setup version pinning
        if (line.includes('uses: pnpm/action-setup')) {
            newLines.push(line);
            // Skip the next two lines if they are 'with:' and 'version:'
            if (i + 2 < lines.length &&
                lines[i+1].trim() === 'with:' &&
                lines[i+2].trim().startsWith('version:')) {
                i += 2;
            }
            continue;
        }

        newLines.push(line);
    }

    fs.writeFileSync(filePath, newLines.join('\n'));
}

fs.readdirSync(workflowsDir).forEach(file => {
    if (file.endsWith('.yml') || file.endsWith('.yaml')) {
        fixWorkflow(file);
    }
});
