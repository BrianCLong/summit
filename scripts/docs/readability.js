const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const TextStatistics = require('text-statistics');
let fail = false;
function body(md) {
  return md.replace(/```[\s\S]*?```/g, '').replace(/<[^>]+>/g, '');
}
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.mdx?$/.test(f)) {
      const g = matter.read(p);
      const txt = body(g.content);
      const ts = new TextStatistics(txt);
      const grade = ts.fleschKincaidGradeLevel();
      if (grade > 10 && (g.data.type || '') !== 'reference') {
        console.warn(`High grade level (${grade.toFixed(1)}): ${p}`);
      }
    }
  }
})('docs');
process.exit(fail ? 1 : 0);
