'use strict';

const RISKY_PREFIXES = ['file:', 'link:', 'git+', 'github:', 'git://', 'ssh://'];

function isPinnedSpec(spec) {
  if (!spec) {
    return false;
  }
  if (spec.startsWith('workspace:')) {
    return false;
  }
  return /^[0-9]+(\.[0-9]+){1,2}(-[0-9A-Za-z.-]+)?$/.test(spec);
}

function isRiskySpec(spec) {
  if (!spec) {
    return false;
  }
  return RISKY_PREFIXES.some((prefix) => spec.startsWith(prefix));
}

function parsePackageLock(lockfile, filePath) {
  const findings = { unpinned: [], risky: [], versions: [] };
  const packages = lockfile.packages || {};
  const root = packages[''] || {};
  const dependencies = {
    ...(root.dependencies || {}),
    ...(root.devDependencies || {}),
    ...(root.optionalDependencies || {}),
  };

  Object.entries(dependencies).forEach(([name, spec]) => {
    if (!isPinnedSpec(spec)) {
      findings.unpinned.push({ name, spec, file: filePath, source: 'package-lock' });
    }
    if (isRiskySpec(spec)) {
      findings.risky.push({ name, spec, file: filePath, source: 'package-lock' });
    }
  });

  Object.entries(packages).forEach(([packagePath, meta]) => {
    if (!meta || !meta.version) {
      return;
    }
    if (!packagePath.startsWith('node_modules/')) {
      return;
    }
    const name = packagePath.replace('node_modules/', '');
    findings.versions.push({ name, version: meta.version, source: 'package-lock' });
  });

  return findings;
}

function parsePnpmLockText(contents, filePath) {
  const findings = { unpinned: [], risky: [], versions: [] };
  const lines = contents.split(/\r?\n/);
  let section = null;
  let currentImporter = null;
  let currentIndent = 0;
  let inSpecifiers = false;

  lines.forEach((line) => {
    if (!line.trim()) {
      return;
    }
    const indent = line.match(/^ */)[0].length;
    const trimmed = line.trim();
    if (trimmed === 'importers:') {
      section = 'importers';
      currentImporter = null;
      return;
    }
    if (trimmed === 'packages:') {
      section = 'packages';
      currentImporter = null;
      inSpecifiers = false;
      return;
    }
    if (section === 'importers') {
      if (indent === 2 && trimmed.endsWith(':')) {
        currentImporter = trimmed.slice(0, -1);
        inSpecifiers = false;
        currentIndent = indent;
        return;
      }
      if (trimmed === 'specifiers:' && indent > currentIndent) {
        inSpecifiers = true;
        currentIndent = indent;
        return;
      }
      if (inSpecifiers && indent > currentIndent && trimmed.includes(':')) {
        const [name, rawSpec] = trimmed.split(/:\s+/);
        const spec = rawSpec || '';
        if (!isPinnedSpec(spec)) {
          findings.unpinned.push({
            name,
            spec,
            file: filePath,
            source: `pnpm-lock:${currentImporter || '.'}`,
          });
        }
        if (isRiskySpec(spec)) {
          findings.risky.push({
            name,
            spec,
            file: filePath,
            source: `pnpm-lock:${currentImporter || '.'}`,
          });
        }
        return;
      }
      if (indent <= currentIndent) {
        inSpecifiers = false;
      }
      return;
    }
    if (section === 'packages') {
      if (indent === 2 && trimmed.startsWith('/') && trimmed.endsWith(':')) {
        const key = trimmed.slice(0, -1);
        const parsed = parsePnpmPackageKey(key);
        if (parsed) {
          findings.versions.push({
            name: parsed.name,
            version: parsed.version,
            source: 'pnpm-lock',
          });
        }
      }
    }
  });

  return findings;
}

function parsePnpmPackageKey(key) {
  const trimmed = key.replace(/^\//, '');
  const atIndex = trimmed.lastIndexOf('@');
  if (atIndex <= 0 || atIndex === trimmed.length - 1) {
    return null;
  }
  const name = trimmed.slice(0, atIndex);
  const version = trimmed.slice(atIndex + 1);
  if (!version || version.includes('(')) {
    return null;
  }
  return { name, version };
}

function parseRequirementsFile(contents, filePath) {
  const findings = { unpinned: [], risky: [], versions: [] };
  const lines = contents.split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }
    if (trimmed.startsWith('-r') || trimmed.startsWith('--requirement')) {
      return;
    }
    const entry = trimmed.replace(/^-e\s+/, '');
    if (entry.includes('git+') || entry.includes('://')) {
      findings.risky.push({
        name: entry.split('#')[0],
        spec: entry,
        file: filePath,
        source: 'requirements',
      });
      return;
    }
    const match = entry.match(/^([A-Za-z0-9_.-]+)(.*)$/);
    if (!match) {
      return;
    }
    const name = match[1];
    const specifier = match[2] || '';
    if (!specifier.includes('==')) {
      findings.unpinned.push({
        name,
        spec: specifier || '(none)',
        file: filePath,
        source: 'requirements',
      });
    } else {
      const version = specifier.split('==')[1].split(';')[0].trim();
      if (version) {
        findings.versions.push({ name, version, source: 'requirements' });
      }
    }
  });
  return findings;
}

module.exports = {
  parsePackageLock,
  parsePnpmLockText,
  parseRequirementsFile,
  parsePnpmPackageKey,
  isPinnedSpec,
  isRiskySpec,
};
