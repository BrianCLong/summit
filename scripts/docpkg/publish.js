const { execSync } = require('child_process');
const fs = require('fs');
const f = fs.readdirSync('dist/docpkg').find((x) => x.endsWith('.tar.gz'));
execSync(`gh release upload docpkg-${Date.now()} dist/docpkg/${f} --clobber`);
