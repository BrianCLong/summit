import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const normalizeForSort = (value) => {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeForSort(entry));
  }
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = normalizeForSort(value[key]);
        return acc;
      }, {});
  }
  return value;
};

export const stableStringify = (value) => {
  const normalized = normalizeForSort(value);
  return `${JSON.stringify(normalized, null, 2)}\n`;
};

export const sha256Bytes = (buffer) =>
  crypto.createHash('sha256').update(buffer).digest('hex');

export const sha256File = async (filePath) => {
  const hash = crypto.createHash('sha256');
  await new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', resolve);
  });
  return hash.digest('hex');
};

const casRelativePath = (digest) =>
  path.join('sha256', digest.slice(0, 2), digest.slice(2, 4), `${digest}.blob`);

const casMetaRelativePath = (digest) =>
  path.join(
    'sha256',
    digest.slice(0, 2),
    digest.slice(2, 4),
    `${digest}.meta.json`,
  );

const writeFileAtomic = async (targetPath, contents) => {
  const dir = path.dirname(targetPath);
  const tempName = `.${path.basename(targetPath)}.${Date.now()}.${
    process.pid
  }.tmp`;
  const tempPath = path.join(dir, tempName);

  await fs.promises.mkdir(dir, { recursive: true });

  const handle = await fs.promises.open(tempPath, 'wx');
  try {
    await handle.writeFile(contents);
    await handle.sync();
  } finally {
    await handle.close();
  }
  await fs.promises.rename(tempPath, targetPath);
};

const fileExists = async (filePath) => {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch (error) {
    return false;
  }
};

export const casPutFile = async ({ casRoot, filePath, writeMeta = true }) => {
  const stats = await fs.promises.stat(filePath);
  const digest = await sha256File(filePath);
  const relativePath = casRelativePath(digest);
  const casPath = path.join(casRoot, relativePath);
  const metaRelativePath = casMetaRelativePath(digest);
  const metaPath = path.join(casRoot, metaRelativePath);

  if (!(await fileExists(casPath))) {
    const tempBuffer = await fs.promises.readFile(filePath);
    await writeFileAtomic(casPath, tempBuffer);
  }

  if (writeMeta && !(await fileExists(metaPath))) {
    const metadata = {
      digest,
      size: stats.size,
      created_at: new Date().toISOString(),
    };
    await writeFileAtomic(metaPath, stableStringify(metadata));
  }

  return {
    digest,
    size: stats.size,
    casPath,
    casRelativePath: relativePath,
    metaPath,
    metaRelativePath,
  };
};

export const casLinkRunFile = async ({
  runRoot,
  relPath,
  casEntry,
  manifestPath = 'run-manifest.json',
  category,
  sha,
  toolVersions = {},
  policyHashes = {},
}) => {
  const manifestLocation = path.join(runRoot, manifestPath);
  let manifest = null;

  if (await fileExists(manifestLocation)) {
    const raw = await fs.promises.readFile(manifestLocation, 'utf8');
    manifest = JSON.parse(raw);
  }

  if (!manifest) {
    manifest = {
      schema_version: '1',
      category,
      sha,
      created_at: new Date().toISOString(),
      files: [],
      tool_versions: toolVersions,
      policy_hashes: policyHashes,
    };
  }

  const filtered = (manifest.files || []).filter(
    (entry) => entry.path !== relPath,
  );
  filtered.push({
    path: relPath,
    sha256: casEntry.digest,
    size: casEntry.size,
    cas: casEntry.casRelativePath,
  });
  filtered.sort((a, b) => a.path.localeCompare(b.path));
  manifest.files = filtered;

  await writeFileAtomic(manifestLocation, stableStringify(manifest));
  return manifest;
};
