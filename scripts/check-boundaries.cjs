const fs = require('fs');
const path = require('path');

const BOUNDARIES = [
  {
    name: 'server',
    root: 'server',
    forbidden: ['client', 'apps/web', 'apps/client'],
  },
  {
    name: 'client',
    root: 'client',
    forbidden: ['server'],
  },
  {
    name: 'apps/web',
    root: 'apps/web',
    forbidden: ['server'],
  },
  {
    name: 'packages',
    root: 'packages',
    forbidden: ['server', 'client', 'apps'],
  }
];

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    const fullPath = path.join(dirPath, file);
    let stat;
    try {
      // Use lstat so symlink loops in worktrees/node_modules do not crash traversal.
      stat = fs.lstatSync(fullPath);
    } catch (error) {
      if (error && (error.code === 'ELOOP' || error.code === 'ENOENT')) {
        return;
      }
      throw error;
    }

    if (stat.isSymbolicLink()) {
      return;
    }

    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist' && file !== 'build') {
        arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

function checkFile(filepath, forbidden) {
  const content = fs.readFileSync(filepath, 'utf8');
  const violations = [];

  forbidden.forEach(forbiddenTerm => {
    // Basic regex to catch import ... from '...forbidden...' or require('...forbidden...')
    // Note: This is a heuristic. It assumes imports use relative paths like ../../client or absolute-like paths.
    // We strictly check for relative imports crossing boundaries or specific package names if they matched the folder names.

    // Check for "import ... from '.../client/...'" or similar
    // We look for patterns that suggest reaching OUT of the root and INTO a forbidden one.
    // A simple heuristic is looking for the forbidden string in the import path.

    const regex = new RegExp(`(import|require)\\s*[(]?['"](.*${forbiddenTerm}.*)['"][)]?`, 'g');
    let match;
    while ((match = regex.exec(content)) !== null) {
        // Filter out false positives?
        // For now, if the import path contains the forbidden root name, flag it.
        // e.g. inside server: import ... from '../../client/src/...'
        if (match[2].includes(`/${forbiddenTerm}/`) || match[2].startsWith(`${forbiddenTerm}/`)) {
             violations.push(`Line found: ${match[0]}`);
        }
    }
  });

  return violations;
}

console.log("🔍 Checking Parallelization Boundaries...");
let hasErrors = false;

BOUNDARIES.forEach(boundary => {
  if (!fs.existsSync(boundary.root)) return;

  console.log(`Checking ${boundary.name}...`);
  const files = getAllFiles(boundary.root);

  files.forEach(file => {
    const violations = checkFile(file, boundary.forbidden);
    if (violations.length > 0) {
      console.error(`❌ Violation in ${file}:`);
      violations.forEach(v => console.error(`   ${v}`));
      hasErrors = true;
    }
  });
});

if (hasErrors) {
  console.error("\n❌ Boundary violations found! See docs/BOUNDARIES.md");
  process.exit(1);
} else {
  console.log("\n✅ No boundary violations found.");
}
