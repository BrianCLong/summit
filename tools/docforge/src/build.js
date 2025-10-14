const fs = require('fs/promises');
const path = require('path');
const { extractJsDocs } = require('./extractors/js');
const { extractPythonDocs } = require('./extractors/python');
const { extractGoDocs } = require('./extractors/go');
const { collectAdrDocs } = require('./collect-adr');
const { ensureDir, walkFiles, writeFileAtomic } = require('./fs-utils');
const { renderIndexPage, renderModulePage, renderAdrPage } = require('./templates');
const { createSearchIndex } = require('./search');
const { createSitemap } = require('./sitemap');
const { sanitizeId } = require('./sanitizers');

const DEFAULT_VERSION = 'latest';

function uniqueBy(arr, key) {
  const seen = new Set();
  const out = [];
  for (const item of arr) {
    const value = key(item);
    if (!seen.has(value)) {
      seen.add(value);
      out.push(item);
    }
  }
  return out;
}

async function buildSite({ rootDir, outDir, version }) {
  const pkgPath = path.join(rootDir, 'package.json');
  let resolvedVersion = version;
  if (!resolvedVersion) {
    try {
      const pkgRaw = await fs.readFile(pkgPath, 'utf8');
      const pkg = JSON.parse(pkgRaw);
      resolvedVersion = pkg.version || DEFAULT_VERSION;
    } catch (error) {
      resolvedVersion = DEFAULT_VERSION;
    }
  }

  const jsFiles = await walkFiles(rootDir, {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    includeDirectories: ['src', 'server', 'client', 'packages', 'services', 'tools', 'apps'],
    ignore: ['node_modules', 'dist', 'build', 'coverage', 'docs/site', 'docs/generated']
  });
  const pyFiles = await walkFiles(rootDir, {
    extensions: ['.py'],
    includeDirectories: ['src', 'server', 'tools', 'apps', 'packages', 'services'],
    ignore: ['node_modules', '__pycache__', '.venv', 'dist', 'build', 'coverage']
  });
  const goFiles = await walkFiles(rootDir, {
    extensions: ['.go'],
    includeDirectories: ['src', 'server', 'apps', 'packages', 'services', 'pcbo'],
    ignore: ['node_modules', 'dist', 'build', 'coverage', 'vendor']
  });

  const modules = [];

  for (const file of jsFiles) {
    const absolute = path.join(rootDir, file);
    const content = await fs.readFile(absolute, 'utf8');
    const entries = extractJsDocs(content);
    if (entries.length === 0) {
      continue;
    }
    modules.push({
      id: sanitizeId(file),
      path: file,
      language: 'JavaScript',
      entries
    });
  }

  for (const file of pyFiles) {
    const absolute = path.join(rootDir, file);
    const content = await fs.readFile(absolute, 'utf8');
    const entries = extractPythonDocs(content);
    if (entries.length === 0) {
      continue;
    }
    modules.push({
      id: sanitizeId(file),
      path: file,
      language: 'Python',
      entries
    });
  }

  for (const file of goFiles) {
    const absolute = path.join(rootDir, file);
    const content = await fs.readFile(absolute, 'utf8');
    const entries = extractGoDocs(content);
    if (entries.length === 0) {
      continue;
    }
    modules.push({
      id: sanitizeId(file),
      path: file,
      language: 'Go',
      entries
    });
  }

  modules.sort((a, b) => a.path.localeCompare(b.path));

  const adrs = await collectAdrDocs(rootDir);

  await ensureDir(outDir);
  const versionDir = path.join(outDir, resolvedVersion);
  await ensureDir(versionDir);
  await ensureDir(path.join(versionDir, 'modules'));
  await ensureDir(path.join(versionDir, 'adrs'));

  const modulePages = [];

  for (const module of modules) {
    const html = renderModulePage(module, resolvedVersion);
    const relativePath = path.join(resolvedVersion, 'modules', `${module.id}.html`);
    const absolutePath = path.join(outDir, relativePath);
    await writeFileAtomic(absolutePath, html);
    modulePages.push({ module, relativePath });
  }

  const adrPages = [];
  for (const adr of adrs) {
    const html = renderAdrPage(adr, resolvedVersion);
    const relativePath = path.join(resolvedVersion, 'adrs', `${adr.id}.html`);
    const absolutePath = path.join(outDir, relativePath);
    await writeFileAtomic(absolutePath, html);
    adrPages.push({ adr, relativePath });
  }

  const versionIndexHtml = renderIndexPage({
    version: resolvedVersion,
    modules,
    adrs,
    versionScoped: true
  });
  await writeFileAtomic(path.join(versionDir, 'index.html'), versionIndexHtml);

  const versionsManifestPath = path.join(outDir, 'versions.json');
  let versions = [];
  try {
    const raw = await fs.readFile(versionsManifestPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      versions = parsed;
    }
  } catch (error) {
    versions = [];
  }

  const normalizedVersions = uniqueBy(
    [...versions, { version: resolvedVersion }],
    (item) => item.version
  ).sort((a, b) => a.version.localeCompare(b.version));

  await writeFileAtomic(
    versionsManifestPath,
    JSON.stringify(normalizedVersions, null, 2) + '\n'
  );

  const rootIndexHtml = renderIndexPage({
    version: resolvedVersion,
    modules,
    adrs,
    versionScoped: false,
    versions: normalizedVersions
  });
  await writeFileAtomic(path.join(outDir, 'index.html'), rootIndexHtml);

  const searchIndex = createSearchIndex({
    version: resolvedVersion,
    modules,
    adrs,
    modulePages,
    adrPages
  });
  await writeFileAtomic(
    path.join(versionDir, 'search-index.json'),
    JSON.stringify(searchIndex, null, 2) + '\n'
  );

  const sitemap = createSitemap({
    outDir,
    version: resolvedVersion,
    modulePages,
    adrPages
  });
  await writeFileAtomic(path.join(outDir, 'sitemap.xml'), sitemap);

  return {
    version: resolvedVersion,
    moduleCount: modules.length,
    adrCount: adrs.length
  };
}

module.exports = {
  buildSite
};
