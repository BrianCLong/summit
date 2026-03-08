"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const eslint_1 = require("eslint");
const madge_1 = __importDefault(require("madge"));
const ts_morph_1 = require("ts-morph");
async function main() {
    // 1) Lint deltas with strict rules + autofix preview
    const eslint = new eslint_1.ESLint({ fix: true, extensions: ['.ts', '.tsx'] });
    const results = await eslint.lintFiles(process.env.CHANGED_FILES.split('\n'));
    // 2) Dep graph impact
    const g = await (0, madge_1.default)('.', { tsConfig: './tsconfig.json' });
    const impact = g.depends('server/src/index.ts');
    // 3) Smells (ts-morph): anyasync without await, unhandled promises, broad any
    const proj = new ts_morph_1.Project({ tsConfigFilePath: 'tsconfig.json' });
    const smells = proj
        .getSourceFiles()
        .flatMap((f) => f
        .getDescendantsOfKind(ts.SyntaxKind.AnyKeyword)
        .map((n) => ({ file: f.getFilePath(), pos: n.getStart() })));
    // 4) Emit GitHub summary
    console.log('::notice file=tools/ci/smart_review.ts::' +
        JSON.stringify({ lint: results.length, impact, smells }));
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
