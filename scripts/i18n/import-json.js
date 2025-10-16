const fs = require('fs');
const path = require('path');
const map = JSON.parse(fs.readFileSync('i18n/import/es.json', 'utf8')); // { slug: translatedContent }
for (const [slug, md] of Object.entries(map)) {
  const out = path.join('i18n/es', slug);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, md);
}
