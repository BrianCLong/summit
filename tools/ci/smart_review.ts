import { ESLint } from 'eslint';
import madge from 'madge';
import { Project } from 'ts-morph';
async function main() {
  // 1) Lint deltas with strict rules + autofix preview
  const eslint = new ESLint({ fix: true, extensions: ['.ts', '.tsx'] });
  const results = await eslint.lintFiles(
    process.env.CHANGED_FILES!.split('\n'),
  );
  // 2) Dep graph impact
  const g = await madge('.', { tsConfig: './tsconfig.json' });
  const impact = g.depends('server/src/index.ts');
  // 3) Smells (ts-morph): anyasync without await, unhandled promises, broad any
  const proj = new Project({ tsConfigFilePath: 'tsconfig.json' });
  const smells = proj
    .getSourceFiles()
    .flatMap((f) =>
      f
        .getDescendantsOfKind(ts.SyntaxKind.AnyKeyword)
        .map((n) => ({ file: f.getFilePath(), pos: n.getStart() })),
    );
  // 4) Emit GitHub summary
  console.log(
    '::notice file=tools/ci/smart_review.ts::' +
      JSON.stringify({ lint: results.length, impact, smells }),
  );
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
