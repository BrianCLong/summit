const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const mode = process.env.DOCS_VISIBILITY || 'public';
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.mdx?$/.test(f)) {
      const g = matter.read(p);
      const vis = g.data.visibility || 'public';
      if (mode === 'public' && vis !== 'public') fs.unlinkSync(p);
      if (mode === 'partner' && !['public', 'partner'].includes(vis))
        fs.unlinkSync(p);
    }
  }
}
walk('docs');
console.log('Filtered docs for', mode);
