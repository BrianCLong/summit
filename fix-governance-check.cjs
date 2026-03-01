const fs = require('fs');
const file = '.github/workflows/governance-check.yml';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/title\.startsWith\('feat:'\)/g, "title.match(/^feat(?:\\([^)]+\\))?:/)");
content = content.replace(/title\.startsWith\('fix:'\)/g, "title.match(/^fix(?:\\([^)]+\\))?:/)");
content = content.replace(/title\.startsWith\('docs:'\)/g, "title.match(/^docs(?:\\([^)]+\\))?:/)");
fs.writeFileSync(file, content);
