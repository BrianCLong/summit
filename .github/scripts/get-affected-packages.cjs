const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function getAffectedPackages() {
  try {
    const diffCommand = 'git diff --name-only origin/main';
    const changedFiles = execSync(diffCommand, { encoding: 'utf-8' }).split('\n').filter(Boolean);

    if (changedFiles.length === 0) {
      console.log('[]');
      return;
    }

    const yamlContent = fs.readFileSync('pnpm-workspace.yaml', 'utf-8');
    const packagesLines = yamlContent.split('\n');
    let inPackages = false;
    const workspaces = [];

    for (const line of packagesLines) {
      if (line.trim() === 'packages:') {
        inPackages = true;
        continue;
      }
      if (inPackages && line.trim().startsWith('- ')) {
        let pattern = line.trim().substring(2).replace(/['"]/g, '');
        if (pattern.endsWith('/*')) {
          pattern = pattern.substring(0, pattern.length - 2);
        }
        workspaces.push(pattern);
      } else if (inPackages && line.trim() !== '' && !line.trim().startsWith('-')) {
        inPackages = false;
      }
    }

    const affectedPackages = new Set();

    for (const file of changedFiles) {
      for (const workspace of workspaces) {
        if (file.startsWith(workspace + '/')) {
          const parts = file.split('/');
          const workspaceParts = workspace.split('/');
          if (parts.length > workspaceParts.length) {
            const pkgName = parts.slice(0, workspaceParts.length + 1).join('/');
            const packageJsonPath = path.join(pkgName, 'package.json');
            if (fs.existsSync(packageJsonPath)) {
              affectedPackages.add(pkgName);
            }
          }
        }
      }
    }

    if (affectedPackages.size === 0) {
      console.log('[]');
    } else {
      console.log(JSON.stringify(Array.from(affectedPackages)));
    }
  } catch (error) {
    console.error('Error determining affected packages:', error.message);
    process.exit(1);
  }
}

getAffectedPackages();
