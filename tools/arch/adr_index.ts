import fs from 'fs';
const adrs = fs.readdirSync('docs/adr').filter((f) => f.endsWith('.md'));
const rules = adrs.flatMap((f) => {
  const s = fs.readFileSync(`docs/adr/${f}`, 'utf8');
  const lines = [...s.matchAll(/<!-- guard:\s*(.+?)\s*-->/g)].map((m) => m[1]);
  return lines.map((l) => ({ id: f, rego: l }));
});
fs.writeFileSync('.maestro/adr_rules.json', JSON.stringify(rules, null, 2));
