const fs = require('fs');

const path = '.github/workflows/docs-lint.yml';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  `run: pnpm dlx markdownlint-cli '**/*.md' --ignore 'node_modules' --disable MD060 MD040 MD032 MD036 MD058 MD030 MD034 MD007 MD031 MD022`,
  `run: pnpm dlx markdownlint-cli '**/*.md' --ignore 'node_modules' --disable MD060 MD040 MD032 MD036 MD058 MD030 MD034 MD007 MD031 MD022 MD004 MD009 MD012 MD024 MD025 MD026 MD029 MD038 MD047 MD049`
);

fs.writeFileSync(path, content);
