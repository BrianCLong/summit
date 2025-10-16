const fs = require('fs');
const path = require('path');
const { default: $RefParser } = require('@apidevtools/json-schema-ref-parser');
const Ajv = require('ajv').default;

async function main() {
  const specPath = 'api/intelgraph-core-api.yaml';
  const spec = await $RefParser.dereference(specPath);
  const schemas = spec.components?.schemas || {};
  const files = [];
  (function walk(d) {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f);
      const s = fs.statSync(p);
      s.isDirectory() ? walk(p) : /\.mdx?$/.test(f) && files.push(p);
    }
  })('docs');
  const rx = /```json\s+test\s+schema=([^\s\n]+)[\s\n]([\s\S]*?)```/g;
  const ajv = new Ajv({ allErrors: true, strict: false });
  let fail = 0;
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(rx)) {
      const ref = m[1];
      const json = JSON.parse(m[2]);
      const key = ref.split('#/components/schemas/')[1];
      const schema = schemas[key];
      if (!schema) {
        console.error('Unknown schema', ref, 'in', f);
        fail++;
        continue;
      }
      const ok = ajv.validate(schema, json);
      if (!ok) {
        console.error('Schema validation failed in', f, ajv.errorsText());
        fail++;
      }
    }
  }
  process.exit(fail ? 1 : 0);
}
main();
