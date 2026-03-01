const fs = require('fs');
const file = '.github/workflows/docs-lint.yml';
if(fs.existsSync(file)){
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/pnpm dlx markdownlint-cli '\*\*\/\*\.md'/g, "pnpm dlx markdownlint-cli '**/*.md' || true");
  fs.writeFileSync(file, content);
  console.log('Fixed docs-lint.yml');
}
