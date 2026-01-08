import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import yaml from 'js-yaml';

// Parse arguments
const args = process.argv.slice(2);
const baseSha = args[0] || 'origin/main';
const headSha = args[1] || 'HEAD';

const ARTIFACTS_DIR = 'artifacts/deps-change';

// Ensure artifacts directory exists
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

function getLockfileContent(ref) {
  try {
    return execSync(`git show ${ref}:pnpm-lock.yaml`, { maxBuffer: 10 * 1024 * 1024, encoding: 'utf8' });
  } catch (error) {
    console.warn(`Could not retrieve pnpm-lock.yaml from ${ref}. It might not exist.`);
    return null;
  }
}

function parseLockfile(content) {
  if (!content) return null;
  try {
    return yaml.load(content);
  } catch (e) {
    console.error('Failed to parse lockfile YAML');
    return null;
  }
}

function loadPolicy() {
  try {
    const content = fs.readFileSync('release-policy.yml', 'utf8');
    const doc = yaml.load(content);
    return doc.dependency_change_gate || {};
  } catch (e) {
    console.warn('Could not load release-policy.yml, using defaults');
    return {};
  }
}

function isAllowed(name, allowlist) {
  if (!allowlist || !Array.isArray(allowlist)) return false;
  return allowlist.some(pattern => {
    if (pattern.endsWith('*')) {
      return name.startsWith(pattern.slice(0, -1));
    }
    return name === pattern;
  });
}

function extractDeps(lockfileObj) {
  const deps = new Map(); // key: "importer:package", value: version

  if (!lockfileObj || !lockfileObj.importers) return deps;

  for (const [importerPath, importerData] of Object.entries(lockfileObj.importers)) {
    const allDeps = {
      ...importerData.dependencies,
      ...importerData.devDependencies,
      ...importerData.optionalDependencies
    };

    for (const [name, depData] of Object.entries(allDeps)) {
        // depData might be a string version or an object with version/specifier
        let version = '';
        if (typeof depData === 'string') {
            version = depData;
        } else if (depData && depData.version) {
            version = depData.version;
        }

        // Clean version (pnpm sometimes has peer dep suffixes like (react@...))
        if (version && version.includes('(')) {
            version = version.split('(')[0];
        }

        deps.set(`${importerPath}:${name}`, { name, version, importer: importerPath });
    }
  }
  return deps;
}

function getSemverMajor(version) {
    const match = version.match(/^(\d+)\./);
    return match ? parseInt(match[1], 10) : null;
}

function analyze() {
  console.log(`Analyzing dependency changes between ${baseSha} and ${headSha}...`);

  const baseContent = getLockfileContent(baseSha);
  const headContent = getLockfileContent(headSha);

  const baseLock = parseLockfile(baseContent);
  const headLock = parseLockfile(headContent);

  const baseDeps = extractDeps(baseLock);
  const headDeps = extractDeps(headLock);

  const policy = loadPolicy();
  const allowlist = policy.allowlist || [];

  const added = [];
  const removed = [];
  const changed = [];

  // Check for added and changed
  for (const [key, headDep] of headDeps.entries()) {
    if (isAllowed(headDep.name, allowlist)) continue;

    if (!baseDeps.has(key)) {
      added.push(headDep);
    } else {
      const baseDep = baseDeps.get(key);
      if (baseDep.version !== headDep.version) {
        const fromMajor = getSemverMajor(baseDep.version);
        const toMajor = getSemverMajor(headDep.version);
        const isMajor = fromMajor !== null && toMajor !== null && toMajor > fromMajor;

        changed.push({
          ...headDep,
          from: baseDep.version,
          to: headDep.version,
          isMajor
        });
      }
    }
  }

  // Check for removed
  for (const [key, baseDep] of baseDeps.entries()) {
    if (isAllowed(baseDep.name, allowlist)) continue;

    if (!headDeps.has(key)) {
      removed.push(baseDep);
    }
  }

  const majorBumps = changed.filter(d => d.isMajor);

  const report = {
    summary: {
      added: added.length,
      removed: removed.length,
      changed: changed.length,
      majorBumps: majorBumps.length,
      totalEvents: added.length + removed.length + majorBumps.length
    },
    added: added.map(d => `${d.importer}:${d.name}@${d.version}`),
    removed: removed.map(d => `${d.importer}:${d.name}@${d.version}`),
    changed: changed.map(d => ({
        key: `${d.importer}:${d.name}`,
        from: d.from,
        to: d.to,
        isMajor: d.isMajor
    }))
  };

  // Write JSON report
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'report.json'), JSON.stringify(report, null, 2));

  // Write Markdown report
  let md = '# Dependency Change Report\n\n';
  md += `**Base:** ${baseSha} | **Head:** ${headSha}\n\n`;
  md += `**Summary:**\n`;
  md += `- Added: ${report.summary.added}\n`;
  md += `- Removed: ${report.summary.removed}\n`;
  md += `- Major Bumps: ${report.summary.majorBumps}\n`;
  md += `- Total Changes: ${report.summary.changed}\n\n`;

  if (majorBumps.length > 0) {
    md += `## 🚨 Major Version Bumps\n`;
    md += `| Importer | Package | From | To |\n|---|---|---|---|\n`;
    majorBumps.forEach(d => {
        md += `| ${d.importer} | ${d.name} | ${d.from} | ${d.to} |\n`;
    });
    md += '\n';
  }

  if (added.length > 0) {
    md += `## 🟢 Added Dependencies\n`;
    md += `<details><summary>Show ${added.length} added</summary>\n\n`;
    md += `| Importer | Package | Version |\n|---|---|---|\n`;
    added.forEach(d => {
        md += `| ${d.importer} | ${d.name} | ${d.version} |\n`;
    });
    md += `\n</details>\n\n`;
  }

  if (removed.length > 0) {
    md += `## 🔴 Removed Dependencies\n`;
    md += `<details><summary>Show ${removed.length} removed</summary>\n\n`;
    md += `| Importer | Package | Version |\n|---|---|---|\n`;
    removed.forEach(d => {
        md += `| ${d.importer} | ${d.name} | ${d.version} |\n`;
    });
    md += `\n</details>\n\n`;
  }

  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'report.md'), md);
  console.log('Dependency analysis complete. Reports generated in ' + ARTIFACTS_DIR);
}

analyze();
