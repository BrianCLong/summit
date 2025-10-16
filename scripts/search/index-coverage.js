const fs = require('fs');
// Placeholder: read last production sitemap and compare to built routes
const prodCount = Number(process.env.PROD_INDEXED || 0);
const built =
  fs.readFileSync('docs-site/static/sitemap.xml', 'utf8').match(/<url>/g)
    ?.length || 0;
fs.writeFileSync(
  'docs/ops/search/coverage.json',
  JSON.stringify(
    { built, prodIndexed: prodCount, gap: Math.max(0, built - prodCount) },
    null,
    2,
  ),
);
