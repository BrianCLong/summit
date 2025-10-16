const fs = require('fs');
const path = require('path');
let fail = 0;
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f),
      s = fs.statSync(p);
    s.isDirectory() ? walk(p) : /\.(js|css)$/i.test(f) && check(p, s.size);
  }
})('docs-site/build/assets');
function check(p, bytes) {
  const max = 250 * 1024;
  if (bytes > max) {
    console.error('Asset too large', p, bytes);
    fail = 1;
  }
}
process.exit(fail);
