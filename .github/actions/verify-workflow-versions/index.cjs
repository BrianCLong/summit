const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(path.join(dir, f));
    }
  });
}

const rootsToScan = ['.github/workflows', '.github/actions']
  .map(relativePath => path.join(process.cwd(), relativePath));
let hasError = false;

for (const root of rootsToScan) {
  if (!fs.existsSync(root)) continue;

  walkDir(root, (filepath) => {
    if (!filepath.endsWith('.yml') && !filepath.endsWith('.yaml')) return;

    const content = fs.readFileSync(filepath, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const match = line.match(/uses:\s+['"]?(actions\/(checkout|setup-node|cache))@([^\s'"]+)/);
      if (!match) return;

      const action = match[1];
      const version = match[3];
      const isV4Tag = /^v4(\.|$)/.test(version);
      const isPinnedSha = /^[a-f0-9]{40}$/i.test(version);
      if (!isV4Tag && !isPinnedSha) {
        console.error(`::error file=${filepath},line=${index + 1}::${action} must use @v4 or a pinned commit SHA, found @${version}`);
        hasError = true;
      }
    });
  });
}

if (hasError) {
  process.exit(1);
} else {
  console.log("All checked actions are using @v4 or pinned commit SHAs.");
}
