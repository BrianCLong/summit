import fs from 'fs';
import path from 'path';
const kind = process.argv[2];
const name = process.argv[3];
if (!kind || !name) {
  console.error('Usage: pnpm yo:maestro service <name>');
  process.exit(1);
}
const dest = `services/${name}`;
fs.mkdirSync(dest, { recursive: true });
fs.writeFileSync(
  path.join(dest, 'src/index.ts'),
  `import express from "express"; const app=express(); app.get("/health",(_,r)=>r.json({ok:true})); app.listen(process.env.PORT||0);`,
);
fs.writeFileSync(
  path.join(dest, 'package.json'),
  JSON.stringify(
    { name: `@intelgraph/${name}`, scripts: { build: 'tsc -b', test: 'jest' } },
    null,
    2,
  ),
);
console.log(`✅ scaffolded ${kind} ${name}`);
