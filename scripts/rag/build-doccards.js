const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const crypto = require('crypto');

function mdToPlain(md) {
  return md
    .replace(/```[\s\S]*?```/g, (m) => m.replace(/`/g, '')) // keep code text
    .replace(/<[^>]+>/g, '')
    .replace(/^>\s?/gm, '') // strip blockquotes
    .replace(/[\[\]]+([^[\]]+)[\]\]]+\(([^)]+)\)/g, '$1') // links -> text
    .replace(/\![^[]*\]\([^)]*\)/g, ''); // images
}

function chunkText(text, max = 900) {
  const words = text.split(/\s+/);
  const chunks = [];
  let cur = [];
  let len = 0;
  for (const w of words) {
    cur.push(w);
    len += w.length + 1;
    if (len > max) {
      chunks.push(cur.join(' '));
      cur = [];
      len = 0;
    }
  }
  if (cur.length) chunks.push(cur.join(' '));
  return chunks.filter((c) => c.trim().length > 0);
}

const outDir = 'docs/ops/rag';
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'doccards.jsonl');
const fp = fs.createWriteStream(outPath);
let count = 0;
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.mdx?$/.test(f)) emit(p);
  }
})('docs');

function emit(p) {
  const raw = fs.readFileSync(p, 'utf8');
  const g = matter(raw);
  const slug = p.replace(/^docs\//, '').replace(/\.mdx?$/, '');
  const title = g.data.title || path.basename(p);
  const version = g.data.version || 'latest';
  const tags = g.data.tags || [];
  const plain = mdToPlain(g.content);
  const paragraphs = plain
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
  let ordinal = 0;
  for (const para of paragraphs) {
    const chunks = chunkText(para, 900);
    for (const c of chunks) {
      const id = `${slug}#c${ordinal++}`;
      const hash = crypto.createHmac('sha256', c).update(c).digest('hex');
      const rec = {
        id,
        slug,
        version,
        title,
        section: title,
        text: c,
        anchors: [slug],
        hash,
        tokens: Math.ceil(c.length / 4),
        tags,
      };
      fp.write(JSON.stringify(rec) + '\n');
      count++;
    }
  }
}

fp.end(() => {
  fs.writeFileSync(
    path.join(outDir, 'manifest.json'),
    JSON.stringify({ created: new Date().toISOString(), count }, null, 2),
  );
  console.log('DocCards:', count);
});
