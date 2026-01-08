#!/usr/bin/env node

import { execa } from 'execa';
import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { Command } from 'commander';
import { glob } from 'glob';

const program = new Command();

program
  .option('--target <sha>', 'The git sha to generate the snapshot for', 'HEAD')
  .option('--out-dir <dir>', 'The output directory for the snapshot artifacts', 'artifacts/deps')
  .parse(process.argv);

const { target, outDir } = program.opts();

const HIGH_RISK_PATTERNS = [
  'crypto', 'ssh', 'https', 'jwt', 'auth', 'passport',
  'bcrypt', 'argon2', 'scrypt', 'pbkdf2',
  'exec', 'spawn', 'child_process', 'vm',
  'native', 'addon', 'ffi', 'bindings',
  'eval', 'serialize', 'deserialize',
  'xml', 'yaml', 'parser',
];

async function getGitSha(target) {
  const { stdout } = await execa('git', ['rev-parse', target]);
  return stdout.trim();
}

async function findWorkspacePackages(rootDir) {
  const rootPackageJsonPath = path.join(rootDir, 'package.json');
  const rootPackageJson = JSON.parse(await fs.readFile(rootPackageJsonPath, 'utf-8'));
  const workspacePatterns = (rootPackageJson.workspaces?.packages || rootPackageJson.workspaces) ?? [];

  const packagePaths = (await Promise.all(
    workspacePatterns.map(pattern => glob(`${pattern}/package.json`))
  )).flat();

  const packages = [];
  for (const pkgPath of packagePaths) {
    const pkgJson = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));
    packages.push({
      path: pkgPath,
      name: pkgJson.name,
      version: pkgJson.version,
      dependencies: { ...pkgJson.dependencies, ...pkgJson.devDependencies },
    });
  }
  return packages;
}

function parsePackageName(depPath) {
    if (!depPath || !depPath.startsWith('/')) {
        return null;
    }
    const parts = depPath.substring(1).split('/');
    if (depPath.startsWith('/@')) {
        if (parts.length >= 2) {
            return `@${parts[0]}/${parts[1]}`;
        }
    } else {
        if (parts.length >= 1) {
            return parts[0];
        }
    }
    return null;
}


async function generateDependencySnapshot() {
  try {
    const sha = await getGitSha(target);
    console.log(`Generating dependency snapshot for SHA: ${sha}`);

    await fs.mkdir(outDir, { recursive: true });

    const lockfilePath = path.resolve(process.cwd(), 'pnpm-lock.yaml');
    const lockfileContent = await fs.readFile(lockfilePath, 'utf-8');
    const lockfile = yaml.load(lockfileContent);

    const thirdPartyDeps = new Map();
    if (lockfile.packages) {
        for (const [depPath, depDetails] of Object.entries(lockfile.packages)) {
            const name = parsePackageName(depPath);
            if (!name) {
                console.warn(`Could not parse package name from path: ${depPath}`);
                continue;
            }
            const version = depPath.split('/').pop().split('_')[0];
            if (!thirdPartyDeps.has(name)) {
                thirdPartyDeps.set(name, {
                    name,
                    version,
                    occurrences: 0,
                    workspaces: new Set(),
                });
            }
            const existingDep = thirdPartyDeps.get(name);
            existingDep.occurrences += 1;
        }
    }


    const workspacePackages = await findWorkspacePackages(process.cwd());

    for (const workspace of workspacePackages) {
        for (const depName of Object.keys(workspace.dependencies)) {
            if (thirdPartyDeps.has(depName)) {
                thirdPartyDeps.get(depName).workspaces.add(workspace.name);
            }
        }
    }

    const topLevelPackages = workspacePackages.map(p => ({
      workspace: p.path,
      name: p.name,
      version: p.version,
    })).sort((a, b) => a.name.localeCompare(b.name));


    const thirdPartyList = Array.from(thirdPartyDeps.values()).map(dep => ({
      ...dep,
      workspaces: Array.from(dep.workspaces).sort(),
    })).sort((a, b) => a.name.localeCompare(b.name));

    const multipleVersions = [];
    const seen = {};
    if (lockfile.packages) {
        for (const [depPath, depDetails] of Object.entries(lockfile.packages)) {
            const name = parsePackageName(depPath);
             if (!name) continue;
            const version = depPath.split('/').pop().split('_')[0];
            if (!seen[name]) {
                seen[name] = new Set();
            }
            seen[name].add(version);
        }
    }
    for (const [name, versions] of Object.entries(seen)) {
        if (versions.size > 1) {
            multipleVersions.push({ name, versions: Array.from(versions).sort() });
        }
    }
    multipleVersions.sort((a, b) => a.name.localeCompare(b.name));


    const highRiskHeuristics = thirdPartyList
      .filter(dep => dep.name && HIGH_RISK_PATTERNS.some(p => dep.name.includes(p)))
      .sort((a, b) => a.name.localeCompare(b.name));

    const stats = {
      totalDependencies: thirdPartyList.length,
      uniqueDependencies: new Set(thirdPartyList.map(d => d.name)).size,
      topLevelPackages: topLevelPackages.length,
      multipleVersions: multipleVersions.length,
      highRiskHeuristics: highRiskHeuristics.length,
    };

    const snapshot = {
      sha,
      generated_at: new Date().toISOString(),
      stats,
      top_level: topLevelPackages,
      third_party: thirdPartyList,
      multiple_versions: multipleVersions,
    };

    // Generate JSON output
    const jsonOutputPath = path.join(outDir, `deps_${sha}.json`);
    await fs.writeFile(jsonOutputPath, JSON.stringify(snapshot, null, 2));
    console.log(`JSON snapshot written to ${jsonOutputPath}`);

    // Generate Markdown output
    let mdOutput = `# Dependency Snapshot for ${sha}\n\n`;
    mdOutput += `Generated at: ${snapshot.generated_at}\n\n`;
    mdOutput += `## Summary Stats\n`;
    mdOutput += `- **Total Dependencies:** ${stats.totalDependencies}\n`;
    mdOutput += `- **Unique Dependencies:** ${stats.uniqueDependencies}\n`;
    mdOutput += `- **Top-Level Packages:** ${stats.topLevelPackages}\n`;
    mdOutput += `- **Dependencies with Multiple Versions:** ${stats.multipleVersions}\n`;
    mdOutput += `- **High-Risk (Heuristic):** ${stats.highRiskHeuristics}\n\n`;

    mdOutput += `## Top 100 Dependencies by Occurrence\n`;
    mdOutput += `| Name | Version | Occurrences | Workspaces |\n`;
    mdOutput += `|------|---------|-------------|------------|\n`;
    thirdPartyList.sort((a, b) => b.occurrences - a.occurrences).slice(0, 100).forEach(dep => {
      mdOutput += `| ${dep.name} | ${dep.version} | ${dep.occurrences} | ${dep.workspaces.join(', ')} |\n`;
    });
    mdOutput += `\n`;

    if (multipleVersions.length > 0) {
      mdOutput += `## Dependencies with Multiple Versions\n`;
      mdOutput += `| Name | Versions |\n`;
      mdOutput += `|------|---------|\n`;
      multipleVersions.forEach(dep => {
        mdOutput += `| ${dep.name} | ${dep.versions.join(', ')} |\n`;
      });
      mdOutput += `\n`;
    }

    if (highRiskHeuristics.length > 0) {
      mdOutput += `## High-Risk Dependencies (Heuristic)\n\n`;
      mdOutput += `**Disclaimer:** This is a heuristic-based assessment and not a formal vulnerability scan.\n\n`;
      mdOutput += `| Name | Version | Reason |\n`;
      mdOutput += `|------|---------|--------|\n`;
      highRiskHeuristics.forEach(dep => {
        const reasons = HIGH_RISK_PATTERNS.filter(p => dep.name.includes(p));
        mdOutput += `| ${dep.name} | ${dep.version} | ${reasons.join(', ')} |\n`;
      });
      mdOutput += `\n`;
    }

    const mdOutputPath = path.join(outDir, `DEPENDENCY_SNAPSHOT_${sha}.md`);
    await fs.writeFile(mdOutputPath, mdOutput);
    console.log(`Markdown snapshot written to ${mdOutputPath}`);

  } catch (error) {
    console.error('Error generating dependency snapshot:', error);
    process.exit(1);
  }
}

generateDependencySnapshot();
