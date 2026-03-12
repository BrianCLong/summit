const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function getAffectedPackages() {
  const isMain = process.env.GITHUB_REF === 'refs/heads/main' || process.env.GITHUB_REF === 'refs/heads/master';

  if (isMain) {
    return getAllPackages();
  }

  try {
    const baseRef = process.env.GITHUB_BASE_REF || 'main';

    // Check if origin/main exists, if not use just main
    let diffCmd = `git diff --name-only origin/${baseRef}...HEAD`;
    try {
      execSync(diffCmd, { stdio: 'ignore' });
    } catch (e) {
      diffCmd = `git diff --name-only ${baseRef}...HEAD`;
    }

    const output = execSync(diffCmd).toString();
    const changedFiles = output.split('\n').filter(Boolean);

    const affectedPackages = new Set();

    for (const file of changedFiles) {
      // Avoid matching files that aren't actually part of package source
      if (file.startsWith('packages/')) {
        const parts = file.split('/');
        if (parts.length > 2) {
          affectedPackages.add(`packages/${parts[1]}`);
        }
      } else if (file.startsWith('apps/')) {
        const parts = file.split('/');
        if (parts.length > 2) {
          affectedPackages.add(`apps/${parts[1]}`);
        }
      } else if (file.startsWith('client/')) {
        affectedPackages.add('client');
      } else if (file.startsWith('server/')) {
        affectedPackages.add('server');
      }
    }

    // Check if critical files changed that affect everything
    const criticalFiles = ['package.json', 'pnpm-workspace.yaml', 'pnpm-lock.yaml', '.nvmrc'];
    if (changedFiles.some(f => criticalFiles.includes(f) || f.startsWith('.github/workflows/ci-affected.yml') || f.startsWith('.github/scripts/get-affected-packages'))) {
      return getAllPackages();
    }

    return Array.from(affectedPackages);

  } catch (error) {
    console.error('Error determining affected packages:', error.message);
    // Fallback to all packages on error
    return getAllPackages();
  }
}

function getAllPackages() {
  const packages = [];
  const dirsToScan = ['packages', 'apps'];

  for (const dir of dirsToScan) {
    if (fs.existsSync(dir)) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && fs.existsSync(path.join(dir, entry.name, 'package.json'))) {
          packages.push(`${dir}/${entry.name}`);
        }
      }
    }
  }

  if (fs.existsSync('client') && fs.existsSync('client/package.json')) packages.push('client');
  if (fs.existsSync('server') && fs.existsSync('server/package.json')) packages.push('server');

  return packages;
}

const affected = getAffectedPackages();
console.log(JSON.stringify(affected));
