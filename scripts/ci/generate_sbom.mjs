import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import yaml from 'js-yaml';
import {
  ROOT_DIR,
  normalizePath,
  normalizeWorkspaceId,
  parseArgs,
  readJson,
  readPolicy,
  resolveWorkspacePaths,
  stableStringify,
} from './evidence-utils.mjs';

const DEFAULT_POLICY = path.join(
  ROOT_DIR,
  'docs/ga/EVIDENCE_BUNDLE_POLICY.yml',
);

const toPosixPath = (value) => value.split(path.sep).join('/');

const getGitSha = () =>
  execSync('git rev-parse HEAD', { cwd: ROOT_DIR }).toString().trim();

const parseLockfile = () => {
  const lockPath = path.join(ROOT_DIR, 'pnpm-lock.yaml');
  if (!fs.existsSync(lockPath)) {
    throw new Error('pnpm-lock.yaml not found; SBOM generation requires lockfile');
  }
  const raw = fs.readFileSync(lockPath, 'utf8');
  return yaml.load(raw);
};

const parsePackageKey = (key) => {
  const trimmed = key.startsWith('/') ? key.slice(1) : key;
  const lastAt = trimmed.lastIndexOf('@');
  if (lastAt <= 0) {
    return { name: trimmed, version: '0.0.0' };
  }
  return {
    name: trimmed.slice(0, lastAt),
    version: trimmed.slice(lastAt + 1),
  };
};

const toBomRef = (name, version) => `pkg:npm/${name}@${version}`;

const parseIntegrity = (integrity) => {
  if (!integrity || typeof integrity !== 'string') {
    return [];
  }
  const [algo, content] = integrity.split('-', 2);
  if (!algo || !content) {
    return [];
  }
  const normalizedAlgo = `SHA-${algo.replace('sha', '')}`.toUpperCase();
  return [{ alg: normalizedAlgo, content }];
};

const normalizeVersion = (value) => {
  if (!value) {
    return null;
  }
  if (value.startsWith('link:') || value.startsWith('file:')) {
    return null;
  }
  if (value.startsWith('workspace:')) {
    return value.replace('workspace:', '') || null;
  }
  if (value.startsWith('npm:')) {
    return value.replace('npm:', '');
  }
  return value;
};

const collectDependencies = (data) => {
  const groups = [
    data?.dependencies || {},
    data?.devDependencies || {},
    data?.optionalDependencies || {},
    data?.peerDependencies || {},
  ];
  const deps = new Map();
  for (const group of groups) {
    for (const [name, version] of Object.entries(group)) {
      const normalized = normalizeVersion(version);
      if (normalized) {
        deps.set(name, normalized);
      }
    }
  }
  return Array.from(deps.entries()).sort(([a], [b]) => a.localeCompare(b));
};

const buildComponentsFromLock = (lockData) => {
  const packages = lockData?.packages || {};
  const components = [];

  for (const [key, data] of Object.entries(packages)) {
    const { name, version } = parsePackageKey(key);
    const hashes = parseIntegrity(data?.resolution?.integrity);
    components.push({
      type: 'library',
      name,
      version,
      purl: `pkg:npm/${name}@${version}`,
      'bom-ref': toBomRef(name, version),
      ...(hashes.length ? { hashes } : {}),
    });
  }

  return components.sort((a, b) =>
    `${a.name}@${a.version}`.localeCompare(`${b.name}@${b.version}`),
  );
};

const buildDependenciesFromLock = (lockData) => {
  const packages = lockData?.packages || {};
  const dependencies = [];

  for (const [key, data] of Object.entries(packages)) {
    const { name, version } = parsePackageKey(key);
    const refs = collectDependencies(data).map(([depName, depVersion]) =>
      toBomRef(depName, depVersion),
    );
    const sortedRefs = Array.from(new Set(refs)).sort();
    dependencies.push({
      ref: toBomRef(name, version),
      dependsOn: sortedRefs,
    });
  }

  return dependencies.sort((a, b) => a.ref.localeCompare(b.ref));
};

const buildSbom = ({
  component,
  components,
  dependencies,
  toolName,
  toolVersion,
}) => ({
  bomFormat: 'CycloneDX',
  specVersion: '1.5',
  version: 1,
  metadata: {
    tools: [
      {
        vendor: 'Summit',
        name: toolName,
        version: toolVersion,
      },
    ],
    component,
  },
  components,
  dependencies,
});

const buildWorkspaceSbom = ({
  workspace,
  lockData,
  toolName,
  toolVersion,
}) => {
  const importers = lockData?.importers || {};
  const workspacePath = toPosixPath(workspace.path);
  const importer = importers[workspacePath];
  const components = [];
  const dependencies = [];

  const workspaceComponent = {
    type: workspace.private ? 'application' : 'library',
    name: workspace.name || workspace.path,
    version: workspace.version || '0.0.0',
    purl: workspace.name
      ? `pkg:npm/${workspace.name}@${workspace.version || '0.0.0'}`
      : undefined,
    'bom-ref': workspace.name
      ? toBomRef(workspace.name, workspace.version || '0.0.0')
      : normalizeWorkspaceId(workspace.name, workspace.path),
  };

  components.push(workspaceComponent);

  const deps = collectDependencies(importer);
  const depRefs = [];

  for (const [name, version] of deps) {
    const normalizedVersion = normalizeVersion(version);
    if (!normalizedVersion) {
      continue;
    }
    const depComponent = {
      type: 'library',
      name,
      version: normalizedVersion,
      purl: `pkg:npm/${name}@${normalizedVersion}`,
      'bom-ref': toBomRef(name, normalizedVersion),
    };
    components.push(depComponent);
    depRefs.push(depComponent['bom-ref']);
  }

  dependencies.push({
    ref: workspaceComponent['bom-ref'],
    dependsOn: depRefs.sort(),
  });

  return buildSbom({
    component: workspaceComponent,
    components: components.sort((a, b) =>
      `${a.name}@${a.version}`.localeCompare(`${b.name}@${b.version}`),
    ),
    dependencies,
    toolName,
    toolVersion,
  });
};

const main = () => {
  const args = parseArgs(process.argv.slice(2));
  const policyPath = args.policy || DEFAULT_POLICY;
  const policy = readPolicy(policyPath);
  const formats = policy?.sbom?.formats || ['cyclonedx-json'];
  if (!formats.includes('cyclonedx-json')) {
    throw new Error('Policy requires unsupported SBOM format');
  }
  const outRoot =
    args.out ||
    path.join(ROOT_DIR, 'artifacts/evidence', getGitSha(), 'sbom');

  fs.mkdirSync(outRoot, { recursive: true });

  const lockData = parseLockfile();
  const rootPackage = readJson(path.join(ROOT_DIR, 'package.json'));
  const toolName = 'summit-evidence-sbom';
  const toolVersion = rootPackage.version || '0.0.0';

  const workspacePatterns = policy?.sbom?.workspaces?.include || [];
  const workspacePaths = resolveWorkspacePaths(workspacePatterns);

  const workspaceData = workspacePaths.map((workspacePath) => {
    const packageJsonPath = path.join(ROOT_DIR, workspacePath, 'package.json');
    const workspacePackage = readJson(packageJsonPath);
    return {
      path: normalizePath(workspacePath),
      name: workspacePackage.name,
      version: workspacePackage.version,
      private: workspacePackage.private === true,
    };
  });

  const monorepoComponent = {
    type: 'application',
    name: rootPackage.name || 'summit-monorepo',
    version: rootPackage.version || '0.0.0',
    'bom-ref': rootPackage.name
      ? toBomRef(rootPackage.name, rootPackage.version || '0.0.0')
      : 'summit-monorepo',
  };

  const monorepoSbom = buildSbom({
    component: monorepoComponent,
    components: buildComponentsFromLock(lockData),
    dependencies: buildDependenciesFromLock(lockData),
    toolName,
    toolVersion,
  });

  const monorepoPath = path.join(outRoot, 'monorepo.cdx.json');
  fs.writeFileSync(monorepoPath, stableStringify(monorepoSbom));

  const workspaceDir = path.join(outRoot, 'workspaces');
  fs.mkdirSync(workspaceDir, { recursive: true });

  for (const workspace of workspaceData) {
    if (!policy?.sbom?.workspaces?.include_private && workspace.private) {
      continue;
    }
    const workspaceId = normalizeWorkspaceId(workspace.name, workspace.path);
    const workspaceSbom = buildWorkspaceSbom({
      workspace,
      lockData,
      toolName,
      toolVersion,
    });
    const filePath = path.join(workspaceDir, `${workspaceId}.cdx.json`);
    fs.writeFileSync(filePath, stableStringify(workspaceSbom));
  }

  if (formats.includes('spdx-json')) {
    const notice =
      'SPDX generation is not implemented for the deterministic pnpm-lock SBOM generator.';
    throw new Error(notice);
  }

  console.log(`SBOMs written to ${outRoot}`);
};

main();
