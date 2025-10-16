const fs = require('fs/promises');
const path = require('path');
const { walkFiles } = require('./fs-utils');
const { markdownToHtml } = require('./markdown');
const { summarize } = require('./text');
const { slugify, sanitizeId } = require('./sanitizers');

async function collectAdrDocs(rootDir) {
  const adrDirs = ['docs/adr', 'docs/ADR'];
  const files = new Set();

  for (const dir of adrDirs) {
    const discovered = await walkFiles(rootDir, {
      extensions: ['.md', '.markdown'],
      includeDirectories: [dir],
      ignore: ['node_modules', 'dist', 'build'],
    });
    for (const file of discovered) {
      files.add(file);
    }
  }

  const adrs = [];
  for (const file of Array.from(files).sort()) {
    const absolute = path.join(rootDir, file);
    const raw = await fs.readFile(absolute, 'utf8');
    const titleMatch = raw.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : path.basename(file);
    const summary = summarize(
      raw
        .replace(/```[\s\S]*?```/g, '')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'))[0] || '',
    );
    const html = markdownToHtml(raw);
    const slugSource = titleMatch ? title : file;
    adrs.push({
      id: slugify(slugSource) || sanitizeId(file),
      path: file,
      title,
      summary,
      html,
    });
  }

  return adrs;
}

module.exports = {
  collectAdrDocs,
};
