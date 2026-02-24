#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

function fail(message) {
  console.error(`[sbom-lockfile-drift] ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const options = {
    lockfile: 'pnpm-lock.yaml',
    packageJson: 'package.json',
    sbomCdx: 'artifacts/sbom.cdx.json',
    sbomSpdx: 'artifacts/sbom.spdx.json',
    evidenceOut: 'artifacts/sbom-lockfile-drift.json',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key === '--lockfile' && value) {
      options.lockfile = value;
      i += 1;
    } else if (key === '--package-json' && value) {
      options.packageJson = value;
      i += 1;
    } else if (key === '--sbom-cdx' && value) {
      options.sbomCdx = value;
      i += 1;
    } else if (key === '--sbom-spdx' && value) {
      options.sbomSpdx = value;
      i += 1;
    } else if (key === '--evidence-out' && value) {
      options.evidenceOut = value;
      i += 1;
    } else if (key === '--help') {
      console.log(`Usage:
  node scripts/ci/check-sbom-lockfile-drift.mjs [options]

Options:
  --lockfile <path>      Lockfile path (default: pnpm-lock.yaml)
  --package-json <path>  package.json path (default: package.json)
  --sbom-cdx <path>      CycloneDX SBOM path (default: artifacts/sbom.cdx.json)
  --sbom-spdx <path>     SPDX SBOM path (default: artifacts/sbom.spdx.json)
  --evidence-out <path>  Evidence JSON output path (default: artifacts/sbom-lockfile-drift.json)
`);
      process.exit(0);
    }
  }

  return options;
}

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    fail(`Unable to read ${filePath}: ${error.message}`);
  }
}

function readJson(filePath) {
  try {
    return JSON.parse(readText(filePath));
  } catch (error) {
    fail(`Unable to parse JSON at ${filePath}: ${error.message}`);
  }
}

function collectLockfilePackageNames(lockText) {
  const names = new Set();
  const semverKeyRegex = /^\s{2,}'?(.+?)@([0-9][^:'"\s)]*)(?:\([^'"]+\))?'?:\s*$/gm;
  const aliasKeyRegex = /^\s{2,}'?(.+?)@npm:[^:'"\s)]+(?:\([^'"]+\))?'?:\s*$/gm;

  for (const regex of [semverKeyRegex, aliasKeyRegex]) {
    let match;
    while ((match = regex.exec(lockText)) !== null) {
      const name = (match[1] || '').trim();
      if (!name || name.startsWith('link:') || name.startsWith('workspace:')) {
        continue;
      }
      names.add(name);
    }
  }

  return names;
}

function parseNpmNameFromPurl(purl) {
  if (typeof purl !== 'string' || !purl.toLowerCase().startsWith('pkg:npm/')) {
    return null;
  }
  const withoutScheme = purl.slice('pkg:npm/'.length);
  const withoutQualifiers = withoutScheme.split('?')[0].split('#')[0];
  const atIndex = withoutQualifiers.lastIndexOf('@');
  const rawName = atIndex >= 0 ? withoutQualifiers.slice(0, atIndex) : withoutQualifiers;
  if (!rawName) {
    return null;
  }
  try {
    return decodeURIComponent(rawName);
  } catch {
    return rawName;
  }
}

function collectNpmNamesFromCycloneDx(sbom) {
  const names = new Set();
  const components = Array.isArray(sbom?.components) ? sbom.components : [];
  for (const component of components) {
    const npmName = parseNpmNameFromPurl(component?.purl);
    if (npmName) {
      names.add(npmName);
    }
  }
  return names;
}

function collectNpmNamesFromSpdx(sbom) {
  const names = new Set();
  const packages = Array.isArray(sbom?.packages) ? sbom.packages : [];
  for (const pkg of packages) {
    const refs = Array.isArray(pkg?.externalRefs) ? pkg.externalRefs : [];
    for (const ref of refs) {
      const npmName = parseNpmNameFromPurl(ref?.referenceLocator);
      if (npmName) {
        names.add(npmName);
      }
    }
  }
  return names;
}

function sorted(values) {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  const packageJson = readJson(options.packageJson);
  const lockText = readText(options.lockfile);
  const cdx = readJson(options.sbomCdx);
  const spdx = readJson(options.sbomSpdx);

  const lockNames = collectLockfilePackageNames(lockText);
  if (lockNames.size === 0) {
    fail(`No package entries parsed from ${options.lockfile}`);
  }

  const runtimeDeps = new Set(Object.keys(packageJson?.dependencies || {}));
  const sbomNpmNames = new Set([
    ...collectNpmNamesFromCycloneDx(cdx),
    ...collectNpmNamesFromSpdx(spdx),
  ]);

  const rootPackageName = typeof packageJson?.name === 'string' ? packageJson.name : '';
  const allowedNames = new Set([rootPackageName, ...runtimeDeps].filter(Boolean));

  const missingRuntimeDeps = sorted(
    [...runtimeDeps].filter((name) => !sbomNpmNames.has(name)),
  );
  const unexpectedSbomPackages = sorted(
    [...sbomNpmNames].filter(
      (name) => !lockNames.has(name) && !allowedNames.has(name),
    ),
  );

  const report = {
    lockfile: path.normalize(options.lockfile),
    package_json: path.normalize(options.packageJson),
    sbom: {
      cyclonedx: path.normalize(options.sbomCdx),
      spdx: path.normalize(options.sbomSpdx),
    },
    counts: {
      lockfile_packages: lockNames.size,
      runtime_dependencies: runtimeDeps.size,
      sbom_npm_packages: sbomNpmNames.size,
      missing_runtime_dependencies: missingRuntimeDeps.length,
      unexpected_sbom_packages: unexpectedSbomPackages.length,
    },
    missing_runtime_dependencies: missingRuntimeDeps,
    unexpected_sbom_packages: unexpectedSbomPackages,
    pass:
      missingRuntimeDeps.length === 0 && unexpectedSbomPackages.length === 0,
  };

  fs.mkdirSync(path.dirname(options.evidenceOut), { recursive: true });
  fs.writeFileSync(options.evidenceOut, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  if (!report.pass) {
    if (missingRuntimeDeps.length > 0) {
      console.error(
        `[sbom-lockfile-drift] Missing runtime deps in SBOM: ${missingRuntimeDeps.join(', ')}`,
      );
    }
    if (unexpectedSbomPackages.length > 0) {
      console.error(
        `[sbom-lockfile-drift] Unexpected npm packages in SBOM not present in lockfile: ${unexpectedSbomPackages.join(', ')}`,
      );
    }
    process.exit(1);
  }

  console.log(
    `[sbom-lockfile-drift] OK: runtime deps represented and SBOM npm package set matches lockfile (lockfile packages=${lockNames.size}, sbom npm packages=${sbomNpmNames.size}).`,
  );
}

main();
