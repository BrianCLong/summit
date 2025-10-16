import express from 'express';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import fs from 'fs';
const app = express();
app.use(express.json());
const meta = JSON.parse(fs.readFileSync('docs/ops/meta/index.json', 'utf8'));
const API_KEYS = new Set(
  (process.env.DOCS_API_KEYS || '').split(',').filter(Boolean),
);
const auth = (req, res, next) => {
  const k = req.headers['x-api-key'];
  if (!k || !API_KEYS.has(k))
    return res.status(401).json({ error: 'unauthorized' });
  next();
};
app.use('/v1', rateLimit({ windowMs: 60_000, max: 120 }));
app.get('/v1/meta/pages', auth, (req, res) => {
  const tag = req.query.tag;
  let rows = meta;
  if (tag) rows = rows.filter((m) => (m.tags || []).includes(tag));
  res.json(
    rows.map(({ path, title, summary, owner, lastUpdated, tags }) => ({
      path,
      title,
      summary,
      owner,
      lastUpdated,
      tags,
    })),
  );
});
app.get('/v1/search', auth, (req, res) => {
  const q = String(req.query.q || '').toLowerCase();
  const rows = meta
    .filter(
      (m) =>
        (m.title || '').toLowerCase().includes(q) ||
        (m.summary || '').toLowerCase().includes(q),
    )
    .slice(0, 20);
  res.json(rows);
});
app.post('/v1/badges/assertions', auth, (req, res) => {
  res.status(201).json({ id: crypto.randomUUID() });
});
app.listen(process.env.PORT || 8787, () => console.log('Docs API up'));
