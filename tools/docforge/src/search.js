const { slugify } = require('./sanitizers');

function normalizeUrl(relativePath) {
  return `/${relativePath.replace(/\\/g, '/')}`;
}

function createSearchIndex({ version, modules, adrs, modulePages, adrPages }) {
  const items = [];

  modulePages.forEach(({ module, relativePath }) => {
    items.push({
      id: `module:${module.id}`,
      type: 'module',
      title: module.path,
      url: normalizeUrl(relativePath),
      language: module.language,
      summary: module.entries[0]?.summary || '',
    });
    module.entries.forEach((entry) => {
      const anchor = slugify(entry.name);
      items.push({
        id: `symbol:${module.id}:${anchor}`,
        type: entry.kind,
        title: `${entry.name} (${module.path})`,
        url: `${normalizeUrl(relativePath)}#${anchor}`,
        language: module.language,
        summary: entry.summary,
      });
    });
  });

  adrPages.forEach(({ adr, relativePath }) => {
    items.push({
      id: `adr:${adr.id}`,
      type: 'adr',
      title: adr.title,
      url: normalizeUrl(relativePath),
      summary: adr.summary,
    });
  });

  items.sort((a, b) => a.id.localeCompare(b.id));
  return {
    version,
    generatedAt: '1970-01-01T00:00:00.000Z',
    items,
  };
}

module.exports = {
  createSearchIndex,
};
