const fs = require('fs/promises');
const path = require('path');

async function collectFiles(rootDir) {
  const results = [];
  async function traverse(current, relative) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const relPath = relative ? path.join(relative, entry.name) : entry.name;
      if (entry.isDirectory()) {
        await traverse(path.join(current, entry.name), relPath);
      } else if (entry.isFile()) {
        results.push(relPath.replace(/\\/g, '/'));
      }
    }
  }
  await traverse(rootDir, '');
  return results;
}

function isExternalLink(href) {
  return /^(https?:)?\/\//i.test(href) || href.startsWith('mailto:') || href.startsWith('tel:');
}

function normalizeTarget(sourceFile, href) {
  const [base] = href.split('#');
  const target = base.split('?')[0];
  if (!target || target.trim() === '') {
    return null;
  }
  if (target.startsWith('/')) {
    return target.replace(/^\/+/, '');
  }
  const resolved = path.join(path.dirname(sourceFile), target);
  return resolved.replace(/\\/g, '/');
}

async function linkCheck({ rootDir }) {
  const allFiles = await collectFiles(rootDir);
  const existing = new Set(allFiles);
  const broken = [];

  for (const file of allFiles.filter((filePath) => filePath.endsWith('.html'))) {
    const absolute = path.join(rootDir, file);
    const content = await fs.readFile(absolute, 'utf8');
    const linkPattern = /<a\s[^>]*href="([^"]+)"[^>]*>/gi;
    let match;
    while ((match = linkPattern.exec(content)) !== null) {
      const href = match[1];
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) {
        continue;
      }
      if (isExternalLink(href)) {
        continue;
      }
      const normalized = normalizeTarget(file, href);
      if (!normalized) {
        continue;
      }
      if (normalized.endsWith('/')) {
        const withIndex = `${normalized.replace(/\/+$/, '')}/index.html`;
        if (!existing.has(withIndex)) {
          broken.push({ source: file, target: href });
        }
        continue;
      }
      if (!existing.has(normalized)) {
        broken.push({ source: file, target: href });
      }
    }
  }

  return { broken };
}

module.exports = {
  linkCheck
};
