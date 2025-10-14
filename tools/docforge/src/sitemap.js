function createSitemap({ version, modulePages, adrPages }) {
  const base = '/docs/site';
  const paths = new Set();
  paths.add('/index.html');
  paths.add(`/${version}/index.html`);
  modulePages.forEach(({ relativePath }) => {
    paths.add(`/${relativePath.replace(/\\/g, '/')}`);
  });
  adrPages.forEach(({ relativePath }) => {
    paths.add(`/${relativePath.replace(/\\/g, '/')}`);
  });

  const urls = Array.from(paths).sort();
  const xmlEntries = urls
    .map((url) => `  <url>\n    <loc>${base}${url}</loc>\n  </url>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${xmlEntries}\n</urlset>\n`;
}

module.exports = {
  createSitemap
};
