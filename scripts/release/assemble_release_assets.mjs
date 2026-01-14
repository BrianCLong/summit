import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

const args = process.argv.slice(2);
const options = {
  sha: '',
  out: '',
  tag: '',
};

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === '--sha') {
    options.sha = args[i + 1] ?? '';
    i += 1;
  } else if (arg === '--out') {
    options.out = args[i + 1] ?? '';
    i += 1;
  } else if (arg === '--tag') {
    options.tag = args[i + 1] ?? '';
    i += 1;
  }
}

function runGit(commandArgs) {
  return execFileSync('git', commandArgs, {
    cwd: repoRoot,
    encoding: 'utf8',
  }).trim();
}

const gitSha = options.sha || runGit(['rev-parse', 'HEAD']);
let tag = options.tag || process.env.GITHUB_REF_NAME || '';

if (!tag) {
  try {
    tag = runGit(['describe', '--tags', '--exact-match']);
  } catch (error) {
    tag = '';
  }
}

if (!tag) {
  tag = gitSha;
}

const commitTimestamp = runGit(['show', '-s', '--format=%ct', gitSha]);
const releaseTimestamp = new Date(Number(commitTimestamp) * 1000).toISOString();

const outDir = options.out
  ? path.resolve(options.out)
  : path.join(repoRoot, 'artifacts', 'release', tag);
const packagesDir = path.join(outDir, 'packages');
const sbomDir = path.join(outDir, 'sbom');
const evidenceDir = path.join(outDir, 'evidence');

fs.mkdirSync(packagesDir, { recursive: true });
fs.mkdirSync(sbomDir, { recursive: true });
fs.mkdirSync(evidenceDir, { recursive: true });

function sha256ForFile(filePath) {
  const buffer = fs.readFileSync(filePath);
  const hash = crypto.createHash('sha256');
  hash.update(buffer);
  return hash.digest('hex');
}

function listFiles(baseDir) {
  const entries = [];
  const stack = [baseDir];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }
    const dirEntries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of dirEntries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile()) {
        entries.push(fullPath);
      }
    }
  }
  return entries;
}

function normalizeComponentName(name) {
  return name.replace(/[@/]/g, '-');
}

function toDeterministicUuid(seed) {
  const hash = crypto.createHash('sha256').update(seed).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

function generateSbomDocument({ name, version, components }) {
  return {
    bomFormat: 'CycloneDX',
    specVersion: '1.4',
    serialNumber: `urn:uuid:${toDeterministicUuid(`${name}@${version}:${gitSha}`)}`,
    version: 1,
    metadata: {
      timestamp: releaseTimestamp,
      tools: [
        {
          vendor: 'IntelGraph',
          name: 'release-asset-bundler',
          version: '1.0.0',
        },
      ],
      component: {
        type: 'application',
        name,
        version,
      },
    },
    components: components.map((component) => ({
      type: 'library',
      name: component.name,
      version: component.version,
    })),
  };
}

function getWorkspaceList() {
  const output = execFileSync('pnpm', ['-r', 'list', '--depth', '-1', '--json'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  const parsed = JSON.parse(output);
  if (Array.isArray(parsed)) {
    return parsed;
  }
  return Object.values(parsed ?? {});
}

const workspaceEntries = getWorkspaceList();
const publishablePackages = [];

for (const workspace of workspaceEntries) {
  if (!workspace.path || workspace.path === repoRoot) {
    continue;
  }
  const packageJsonPath = path.join(workspace.path, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    continue;
  }
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  if (packageJson.private) {
    continue;
  }
  publishablePackages.push({
    name: packageJson.name || workspace.name || path.basename(workspace.path),
    version: packageJson.version || workspace.version || '0.0.0',
    path: workspace.path,
    dependencies: packageJson.dependencies || {},
  });
}

if (publishablePackages.length === 0) {
  console.log('No publishable packages found.');
}

const assetMetadata = new Map();

for (const pkg of publishablePackages) {
  const packOutput = execFileSync(
    'npm',
    ['pack', '--silent', '--pack-destination', packagesDir],
    {
      cwd: pkg.path,
      encoding: 'utf8',
    },
  );

  const packLines = packOutput
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const tarballName = packLines[packLines.length - 1];
  const tarballPath = path.join(packagesDir, tarballName);

  if (!fs.existsSync(tarballPath)) {
    throw new Error(`Expected package tarball not found: ${tarballPath}`);
  }

  assetMetadata.set(tarballPath, {
    workspace: pkg.path,
    name: pkg.name,
    version: pkg.version,
    type: 'package',
  });

  const sbomComponents = Object.entries(pkg.dependencies).map(([depName, depVersion]) => ({
    name: depName,
    version: depVersion,
  }));
  const sbomData = generateSbomDocument({
    name: pkg.name,
    version: pkg.version,
    components: sbomComponents,
  });
  const sbomPath = path.join(sbomDir, `${normalizeComponentName(pkg.name)}.sbom.json`);
  fs.writeFileSync(sbomPath, `${JSON.stringify(sbomData, null, 2)}\n`, 'utf8');
  assetMetadata.set(sbomPath, {
    workspace: pkg.path,
    name: pkg.name,
    version: pkg.version,
    type: 'sbom',
  });
}

const monorepoSbomData = generateSbomDocument({
  name: 'intelgraph-platform',
  version: 'monorepo',
  components: publishablePackages.map((pkg) => ({
    name: pkg.name,
    version: pkg.version,
  })),
});
const monorepoSbomPath = path.join(sbomDir, 'monorepo.sbom.json');
fs.writeFileSync(monorepoSbomPath, `${JSON.stringify(monorepoSbomData, null, 2)}\n`, 'utf8');
assetMetadata.set(monorepoSbomPath, {
  workspace: repoRoot,
  name: 'intelgraph-platform',
  version: 'monorepo',
  type: 'sbom',
});

const artifactsEvidenceDir = path.join(repoRoot, 'artifacts', 'evidence');
if (fs.existsSync(artifactsEvidenceDir)) {
  fs.cpSync(artifactsEvidenceDir, evidenceDir, { recursive: true });
  const copiedEvidenceFiles = listFiles(evidenceDir);
  for (const filePath of copiedEvidenceFiles) {
    assetMetadata.set(filePath, {
      workspace: 'evidence',
      name: path.basename(filePath),
      version: tag,
      type: 'evidence',
    });
  }
}

const notesPath = path.join(outDir, 'notes.md');
const notesContent = `# Release ${tag}\n\n` +
  '## Verification\n' +
  `1. Download the release assets bundle.\n` +
  `2. Run: \`pnpm release:verify -- --dir artifacts/release/${tag}\`.\n` +
  '3. If attestations are required, ensure GitHub CLI is available and authenticated.\n';
fs.writeFileSync(notesPath, notesContent, 'utf8');
assetMetadata.set(notesPath, {
  workspace: repoRoot,
  name: 'release-notes',
  version: tag,
  type: 'notes',
});

const allFiles = listFiles(outDir).filter((filePath) => !filePath.endsWith('manifest.json'));
const assets = allFiles
  .map((filePath) => {
    const relativePath = path.relative(outDir, filePath);
    const metadata = assetMetadata.get(filePath);
    return {
      path: relativePath,
      sha256: sha256ForFile(filePath),
      size: fs.statSync(filePath).size,
      workspace: metadata?.workspace ?? repoRoot,
      name: metadata?.name ?? path.basename(filePath),
      version: metadata?.version ?? 'unknown',
      type: metadata?.type ?? 'asset',
    };
  })
  .sort((a, b) => a.path.localeCompare(b.path));

const manifest = {
  meta: {
    tag,
    gitSha,
    generatedAt: releaseTimestamp,
    packageCount: publishablePackages.length,
  },
  assets,
};

const manifestPath = path.join(outDir, 'manifest.json');
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

const manifestHash = sha256ForFile(manifestPath);
const manifestHashPath = path.join(outDir, 'manifest.sha256');
fs.writeFileSync(manifestHashPath, `${manifestHash}  manifest.json\n`, 'utf8');

console.log(`Release assets assembled at ${outDir}`);
