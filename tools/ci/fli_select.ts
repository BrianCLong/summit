import fs from 'fs';
const changed = JSON.parse(fs.readFileSync('changed_ast.json', 'utf8')); // {file:[func1, func2]}
const map = JSON.parse(fs.readFileSync('fli-map.json', 'utf8')) as Array<{
  test: string;
  funcs: string[];
  files: string[];
}>;
const run = new Set<string>();
for (const m of map) {
  for (const [f, ff] of Object.entries(changed))
    if (
      m.files.includes(f) &&
      m.funcs.some((x) => (ff as string[]).includes(x))
    )
      run.add(m.test);
}
fs.writeFileSync('fli-tests.txt', [...run].join('\n'));
console.log(`FLI selected ${run.size} tests`);
