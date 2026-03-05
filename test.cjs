const fs = require('fs');
let content = fs.readFileSync('.github/workflows/agent-guardrails.yml', 'utf8');
console.log(content.indexOf('- name: Install pnpm'));
console.log(content.indexOf('- name: Setup Node'));
