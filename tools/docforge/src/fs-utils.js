const fs = require('fs/promises');
const path = require('path');

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function pathExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch (error) {
    return false;
  }
}

function shouldIgnore(relativePath, ignoreList) {
  if (!ignoreList || ignoreList.length === 0) {
    return false;
  }
  return ignoreList.some((segment) => relativePath.split(path.sep).includes(segment));
}

async function walkFiles(rootDir, options) {
  const {
    extensions = [],
    includeDirectories,
    ignore = []
  } = options;
  const normalizedExt = extensions.map((ext) => ext.toLowerCase());
  const results = [];
  const startDirs = [];

  if (Array.isArray(includeDirectories) && includeDirectories.length > 0) {
    for (const dir of includeDirectories) {
      const absolute = path.join(rootDir, dir);
      if (await pathExists(absolute)) {
        startDirs.push({ absolute, relative: dir });
      }
    }
  } else {
    startDirs.push({ absolute: rootDir, relative: '.' });
  }

  async function traverse(currentAbsolute, currentRelative) {
    const dirEntries = await fs.readdir(currentAbsolute, { withFileTypes: true });
    for (const entry of dirEntries) {
      const entryRelative = currentRelative === '.' ? entry.name : path.join(currentRelative, entry.name);
      if (shouldIgnore(entryRelative, ignore)) {
        continue;
      }
      const entryAbsolute = path.join(currentAbsolute, entry.name);
      if (entry.isDirectory()) {
        await traverse(entryAbsolute, entryRelative);
      } else if (entry.isFile()) {
        if (normalizedExt.length > 0) {
          const ext = path.extname(entry.name).toLowerCase();
          if (!normalizedExt.includes(ext)) {
            continue;
          }
        }
        const relativeFromRoot = entryRelative;
        results.push(relativeFromRoot.replace(/^\.\//, ''));
      }
    }
  }

  for (const start of startDirs) {
    await traverse(start.absolute, start.relative);
  }

  return results.sort();
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function writeFileAtomic(filePath, contents) {
  const dir = path.dirname(filePath);
  await ensureDir(dir);
  await fs.writeFile(filePath, contents, 'utf8');
}

function trimLines(text) {
  return text
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n');
}

module.exports = {
  ensureDir,
  walkFiles,
  escapeHtml,
  writeFileAtomic,
  trimLines
};
