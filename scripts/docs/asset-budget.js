const fs = require('fs');
const path = require('path');
let fail = false;
function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.(png|jpg|jpeg|gif|svg)$/i.test(f)) {
      if (s.size > 800 * 1024) {
        console.error(`Image exceeds 800KB: ${p}`);
        fail = true;
      }
    }
  }
}
walk('docs');
process.exit(fail ? 1 : 0);
