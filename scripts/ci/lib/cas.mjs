import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

const CAS_ALGORITHM = 'sha256';
const CAS_NAMESPACE = 'sha256';

const normalizePath = (value) => value.split(path.sep).join('/');

const casSubpath = (digest) =>
  path.join(CAS_NAMESPACE, digest.slice(0, 2), digest.slice(2, 4), `${digest}.blob`);

const writeFileAtomic = async (destination, data) => {
  const dir = path.dirname(destination);
  await fs.mkdir(dir, { recursive: true });
  const tempName = `.tmp-${process.pid}-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
  const tempPath = path.join(dir, tempName);
  const handle = await fs.open(tempPath, 'wx');
  try {
    await handle.writeFile(data);
    await handle.sync();
  } finally {
    await handle.close();
  }
  await fs.rename(tempPath, destination);
};

export const sha256Bytes = async (buffer) =>
  createHash(CAS_ALGORITHM).update(buffer).digest('hex');

export const sha256File = async (filePath) =>
  new Promise((resolve, reject) => {
    const hash = createHash(CAS_ALGORITHM);
    const stream = createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });

const sortDirEntries = (entries) =>
  entries.sort((a, b) => a.name.localeCompare(b.name));

export const listRunFiles = async (root, { exclude = [] } = {}) => {
  const resolvedRoot = path.resolve(root);
  const files = [];

  const walk = async (current) => {
    const entries = sortDirEntries(
      await fs.readdir(current, { withFileTypes: true }),
    );
    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);
      const rel = normalizePath(path.relative(resolvedRoot, entryPath));
      if (exclude.includes(rel)) {
        continue;
      }
      if (entry.isDirectory()) {
        await walk(entryPath);
      } else if (entry.isFile()) {
        files.push(entryPath);
      }
    }
  };

  await walk(resolvedRoot);
  return files;
};

export const casPutFile = async ({
  casRoot,
  filePath,
  writeMeta = true,
  createdAt = new Date().toISOString(),
}) => {
  const digest = await sha256File(filePath);
  const stats = await fs.stat(filePath);
  const size = stats.size;
  const casRelative = casSubpath(digest);
  const casPath = path.join(path.resolve(casRoot), casRelative);

  try {
    await fs.access(casPath);
  } catch (error) {
    const data = await fs.readFile(filePath);
    await writeFileAtomic(casPath, data);
  }

  if (writeMeta) {
    const metaPath = `${casPath}.meta.json`;
    const meta = {
      schema_version: '1',
      algorithm: CAS_ALGORITHM,
      digest,
      size,
      created_at: createdAt,
      source_path: null,
    };
    const serialized = `${JSON.stringify(meta, null, 2)}\n`;
    try {
      await fs.access(metaPath);
    } catch (error) {
      await writeFileAtomic(metaPath, serialized);
    }
  }

  return {
    digest,
    size,
    casPath: normalizePath(casRelative),
    casFilePath: casPath,
  };
};

export const buildRunManifest = async ({
  runRoot,
  casRoot,
  category,
  sha,
  toolVersions = {},
  policyHashes = {},
  thinMode = false,
}) => {
  const resolvedRoot = path.resolve(runRoot);
  const files = await listRunFiles(resolvedRoot, {
    exclude: ['run-manifest.json'],
  });

  const entries = [];
  for (const filePath of files.sort()) {
    const relativePath = normalizePath(path.relative(resolvedRoot, filePath));
    const casEntry = await casPutFile({ casRoot, filePath });
    entries.push({
      path: relativePath,
      sha256: casEntry.digest,
      size: casEntry.size,
      cas: casEntry.casPath,
    });
  }

  entries.sort((a, b) => a.path.localeCompare(b.path));

  return {
    schema_version: '1',
    category,
    sha,
    created_at: new Date().toISOString(),
    thin_mode: thinMode,
    files: entries,
    tool_versions: toolVersions,
    policy_hashes: policyHashes,
  };
};

export const writeRunManifest = async ({
  runRoot,
  casRoot,
  category,
  sha,
  toolVersions,
  policyHashes,
  thinMode,
}) => {
  const manifest = await buildRunManifest({
    runRoot,
    casRoot,
    category,
    sha,
    toolVersions,
    policyHashes,
    thinMode,
  });
  const manifestPath = path.join(runRoot, 'run-manifest.json');
  await writeFileAtomic(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
};

export const casPathForDigest = (digest) =>
  normalizePath(casSubpath(digest));

export const casConstants = {
  algorithm: CAS_ALGORITHM,
  namespace: CAS_NAMESPACE,
};
