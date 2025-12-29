#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_SBOM = path.join('artifacts', 'sbom', 'sbom.json');
const sbomPath = process.env.SBOM_FILE || DEFAULT_SBOM;

function warn(message) {
  console.warn(`::warning ::${message}`);
}

if (!fs.existsSync(sbomPath)) {
  warn(`SBOM file not found at ${sbomPath}. Generate it first with scripts/generate-sbom.sh.`);
  process.exit(0);
}

let sbom;
try {
  sbom = JSON.parse(fs.readFileSync(sbomPath, 'utf-8'));
} catch (error) {
  warn(`Unable to parse SBOM JSON at ${sbomPath}: ${error.message}`);
  process.exit(0);
}

const components = Array.isArray(sbom.components) ? sbom.components : [];
const blockedLicenses = ['GPL-3.0', 'AGPL-3.0', 'LGPL-3.0'];
const issues = [];

for (const component of components) {
  const licenseEntries = component.licenses || [];
  for (const entry of licenseEntries) {
    const licenseId = entry?.license?.id || entry?.license?.name;
    if (licenseId && blockedLicenses.includes(licenseId)) {
      issues.push(`Blocked license ${licenseId} detected in ${component.name || 'unknown'}@${component.version || 'unknown'}`);
    }
  }

  if (!component.version) {
    issues.push(`Missing version for ${component.name || 'unknown component'}`);
  }
  if (!component.purl) {
    issues.push(`Missing purl for ${component.name || 'unknown component'}`);
  }
}

if (issues.length === 0) {
  console.log('SBOM policy check completed: no issues found (warn-only mode).');
  process.exit(0);
}

warn('SBOM policy check found the following issues (non-blocking):');
for (const issue of issues) {
  warn(issue);
}

process.exit(0);
