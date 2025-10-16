const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const Ajv = require('ajv').default;
const addFormats = require('ajv-formats');
const schema = JSON.parse(
  fs.readFileSync('docs/_meta/frontmatter.schema.json', 'utf8'),
);
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);
let fail = 0;
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.mdx?$/.test(f)) {
      const fm = matter.read(p).data || {};
      if (!validate(fm)) {
        console.error(p, ajv.errorsText(validate.errors));
        fail = 1;
      }
    }
  }
})('docs');
process.exit(fail);
