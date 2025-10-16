#!/usr/bin/env node
const fg = require('fast-glob');
const fs = require('fs');
const path = require('path');

(async () => {
  const patterns = [
    'tests/integration/**/*.{js,jsx,ts,tsx}',
    'tests/graphql/**/*.{js,jsx,ts,tsx}',
    'server/src/tests/**/*.{js,jsx,ts,tsx}',
  ];

  const files = await fg(patterns, {
    ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**'],
    absolute: true,
  });

  const focusRegex = /\b(?:it|test|describe)\.only\s*\(/;
  const consoleRegex = /console\.error\s*\(/;
  const violations = [];

  files.forEach((file) => {
    const content = fs.readFileSync(file, 'utf8');
    if (focusRegex.test(content)) {
      violations.push({ file, message: 'Focused test detected (\.only)' });
    }
    if (consoleRegex.test(content)) {
      violations.push({ file, message: 'console.error detected in tests' });
    }
  });

  if (violations.length) {
    console.error('Test guard violations found:');
    violations.forEach(({ file, message }) => {
      console.error(`  - ${path.relative(process.cwd(), file)}: ${message}`);
    });
    process.exit(1);
  }

  console.log('Test guards passed (no `.only` or `console.error`).');
})();
