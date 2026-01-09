#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const REQUIRED_SECTIONS = [
  'risk',
  'ga',
  'incident',
  'integrations',
  'observability',
  'deploy',
];

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i += 1) {
    const [key, value] = args[i].split('=');
    const normalizedKey = key.replace(/^--/, '');
    if (value === undefined) {
      options[normalizedKey] = args[i + 1];
      i += 1;
    } else {
      options[normalizedKey] = value;
    }
  }

  return {
    tenantProfile: options['tenant-profile'] ?? options.tenantProfile,
    baseFiles: (options.base ?? 'policies/tenants/base.yml')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean),
    overlayFile: options.overlay ?? null,
    outDir: options['out-dir'] ?? 'artifacts/tenants',
  };
}

function loadYaml(filePath) {
  const absolute = path.resolve(process.cwd(), filePath);
  const raw = fs.readFileSync(absolute, 'utf8');
  return yaml.load(raw);
}

function deepMerge(base, overlay, conflicts, context = '') {
  if (Array.isArray(base) && Array.isArray(overlay)) {
    return overlay.slice();
  }

  if (Array.isArray(base) !== Array.isArray(overlay)) {
    conflicts.push({
      path: context || 'root',
      baseType: Array.isArray(base) ? 'array' : typeof base,
      overlayType: Array.isArray(overlay) ? 'array' : typeof overlay,
    });
    return overlay ?? base;
  }

  if (base && overlay && typeof base === 'object' && typeof overlay === 'object') {
    const merged = { ...base };
    Object.entries(overlay).forEach(([key, value]) => {
      const nextContext = context ? `${context}.${key}` : key;
      if (key in base) {
        merged[key] = deepMerge(base[key], value, conflicts, nextContext);
      } else {
        merged[key] = value;
      }
    });
    return merged;
  }

  return overlay ?? base;
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function main() {
  const { tenantProfile, baseFiles, overlayFile, outDir } = parseArgs();

  if (!tenantProfile) {
    console.error('Missing --tenant-profile');
    process.exit(1);
  }

  const overlayPath = overlayFile ?? `policies/tenants/${tenantProfile}.yml`;
  const conflicts = [];

  const basePolicy = baseFiles.reduce((acc, file) => {
    const policy = loadYaml(file);
    return deepMerge(acc, policy, conflicts, '');
  }, {});

  const overlayPolicy = loadYaml(overlayPath);
  const resolved = deepMerge(basePolicy, overlayPolicy, conflicts, '');

  const missingSections = REQUIRED_SECTIONS.filter((section) => !(section in resolved));

  const output = {
    tenant_profile: tenantProfile,
    generated_at: new Date().toISOString(),
    base_files: baseFiles,
    overlay_file: overlayPath,
    conflicts,
    missing_sections: missingSections,
    policy: resolved,
  };

  ensureDir(outDir);
  const outputPath = path.join(outDir, `RESOLVED_POLICIES_${tenantProfile}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  if (conflicts.length > 0 || missingSections.length > 0) {
    console.error('Policy resolution completed with issues.');
    if (conflicts.length > 0) {
      console.error(`Conflicts detected: ${JSON.stringify(conflicts)}`);
    }
    if (missingSections.length > 0) {
      console.error(`Missing sections: ${missingSections.join(', ')}`);
    }
    process.exitCode = 2;
  } else {
    console.log(`Resolved policies written to ${outputPath}`);
  }
}

main();
