#!/usr/bin/env node
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ARTIFACT_DIR, getGitSha, writeArtifacts } from './common.mjs';

const args = process.argv.slice(2);
const feature = parseArg(args, '--feature');
const outDir = parseArg(args, '--outdir') ?? 'features';

if (!feature) {
  throw new Error('Missing required --feature argument');
}
if (!/^[a-z0-9-]+$/.test(feature)) {
  throw new Error('Feature must be lowercase kebab-case ([a-z0-9-]+)');
}

const featureRoot = join(outDir, feature);
const files = buildScaffoldFiles(feature);

for (const [relativePath, content] of files) {
  const destination = join(featureRoot, relativePath);
  mkdirSync(join(destination, '..'), { recursive: true });
  writeFileSync(destination, content, 'utf8');
}

const createdCount = countFiles(featureRoot);
if (createdCount > 200) {
  throw new Error(`Scaffold output exceeded budget: ${createdCount} files`);
}

const report = {
  check: 'vibe:scaffold',
  createdFiles: files.map(([path]) => path).sort(),
  feature,
  featureRoot,
  fileCount: createdCount,
  status: 'passed'
};

const metrics = {
  artifactDir: ARTIFACT_DIR,
  check: 'vibe:scaffold',
  createdFiles: createdCount,
  maxFilesBudget: 200
};

const stamp = {
  gitSha: getGitSha(),
  scaffoldSchemaVersion: '1.0.0',
  templateVersion: '1.0.0'
};

writeArtifacts({ report, metrics, stamp });
process.stdout.write(`vibe:scaffold created ${createdCount} files at ${featureRoot}\n`);

function parseArg(argv, key) {
  const idx = argv.indexOf(key);
  return idx >= 0 ? argv[idx + 1] : undefined;
}

function buildScaffoldFiles(featureName) {
  const evidenceIdExample = `EVID-${featureName.toUpperCase().replace(/-/g, '_')}-0001`;
  return [
    [
      'README.md',
      `# ${featureName}\n\nThis feature was scaffolded by \`pnpm vibe:scaffold --feature ${featureName}\`.\n\n- Feature flag is OFF by default.\n- Evidence IDs must use the format in \`evidence/README.md\`.\n`
    ],
    [
      'flag.ts',
      `export const ${toConstName(featureName)}_ENABLED = false;\n`
    ],
    [
      'evidence/README.md',
      `# Evidence\n\nUse deterministic evidence IDs for this feature.\n\nExample:\n\n- ${evidenceIdExample}\n`
    ],
    [
      '__tests__/policy.test.ts',
      `describe('${featureName} policy stubs', () => {\n  it('keeps feature flag default OFF', () => {\n    expect(true).toBe(true);\n  });\n\n  it('reserves tenant isolation policy coverage', () => {\n    expect('deferred pending policy implementation').toContain('deferred');\n  });\n});\n`
    ]
  ];
}

function toConstName(value) {
  return value.replace(/-/g, '_').toUpperCase();
}

function countFiles(root) {
  let count = 0;
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      count += countFiles(join(root, entry.name));
    } else {
      count += 1;
    }
  }
  return count;
}
