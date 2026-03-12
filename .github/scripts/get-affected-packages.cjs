const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Parse simple YAML arrays since we don't have js-yaml
function getWorkspacePackages() {
  try {
    const content = fs.readFileSync('pnpm-workspace.yaml', 'utf8');
    const lines = content.split('\n');
    const packages = [];
    let inPackagesSection = false;

    for (const line of lines) {
      if (line.trim().startsWith('packages:')) {
        inPackagesSection = true;
        continue;
      }

      if (inPackagesSection) {
        if (line.trim().startsWith('-')) {
          let pkg = line.trim().substring(1).trim();
          // Remove quotes
          pkg = pkg.replace(/^['"]|['"]$/g, '');
          packages.push(pkg);
        } else if (line.trim() !== '' && !line.trim().startsWith('#')) {
          inPackagesSection = false;
        }
      }
    }
    return packages;
  } catch (error) {
    console.error('Error reading pnpm-workspace.yaml:', error);
    return [];
  }
}

function expandGlobToDirectories(globPattern) {
  // A simple implementation of expanding glob patterns to directory paths
  // E.g., 'packages/*' -> ['packages/pkg1', 'packages/pkg2']
  const dirs = [];
  const parts = globPattern.split('/');

  if (parts.length === 1) {
    if (!parts[0].includes('*') && fs.existsSync(parts[0]) && fs.statSync(parts[0]).isDirectory()) {
      dirs.push(parts[0]);
    }
  } else if (parts.length === 2 && parts[1] === '*') {
    const baseDir = parts[0];
    if (fs.existsSync(baseDir)) {
      const subdirs = fs.readdirSync(baseDir).filter(name => {
        const fullPath = path.join(baseDir, name);
        return fs.statSync(fullPath).isDirectory() && fs.existsSync(path.join(fullPath, 'package.json'));
      });
      for (const subdir of subdirs) {
        dirs.push(path.join(baseDir, subdir));
      }
    }
  } else if (parts.length === 3 && parts[1] === '*' && parts[2] === '*') {
    const baseDir = parts[0];
    if (fs.existsSync(baseDir)) {
      const firstLevelSubdirs = fs.readdirSync(baseDir).filter(name => fs.statSync(path.join(baseDir, name)).isDirectory());
      for (const subdir1 of firstLevelSubdirs) {
        const firstLevelPath = path.join(baseDir, subdir1);
        const secondLevelSubdirs = fs.readdirSync(firstLevelPath).filter(name => {
          const fullPath = path.join(firstLevelPath, name);
          return fs.statSync(fullPath).isDirectory() && fs.existsSync(path.join(fullPath, 'package.json'));
        });
        for (const subdir2 of secondLevelSubdirs) {
          dirs.push(path.join(firstLevelPath, subdir2));
        }
      }
    }
  }

  return dirs;
}

function getAllPackages() {
  const workspacePackages = getWorkspacePackages();
  const allDirs = new Set();

  for (const glob of workspacePackages) {
    const expanded = expandGlobToDirectories(glob);
    for (const dir of expanded) {
      allDirs.add(dir);
    }
  }

  return Array.from(allDirs);
}

function getChangedFiles(baseRef) {
  try {
    const output = execSync(`git diff --name-only origin/main...HEAD`, { encoding: 'utf-8' });
    return output.split('\n').filter(Boolean);
  } catch (error) {
    console.error('Error getting changed files from git:', error);
    return [];
  }
}

function main() {
  const baseRef = process.env.BASE_REF || 'origin/main';
  const isPr = process.env.GITHUB_EVENT_NAME === 'pull_request';

  // On main branch or when not a PR, we run all packages
  if (!isPr) {
    const allPackages = getAllPackages();
    console.log(JSON.stringify(allPackages));
    return;
  }

  const changedFiles = getChangedFiles(baseRef);

  if (changedFiles.length === 0) {
    console.log(JSON.stringify([]));
    return;
  }

  const allPackages = getAllPackages();
  const affectedPackages = new Set();

  for (const file of changedFiles) {
    // If root files like package.json or pnpm-workspace.yaml changed, build everything
    if (!file.includes('/')) {
      console.log(JSON.stringify(allPackages));
      return;
    }

    // Find which package this file belongs to
    for (const pkg of allPackages) {
      if (file.startsWith(`${pkg}/`)) {
        affectedPackages.add(pkg);
        break; // Only need to match one package
      }
    }
  }

  console.log(JSON.stringify(Array.from(affectedPackages)));
}

main();
