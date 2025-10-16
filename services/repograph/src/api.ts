import express from 'express';
import Database from 'better-sqlite3';
const db = new Database('repograph.db');
const app = express();
app.get('/api/repograph/impacted', (req, res) => {
  const files = String(req.query.files || '')
    .split(',')
    .filter(Boolean);
  const rows = db
    .prepare(
      `SELECT DISTINCT dst FROM edges WHERE src IN (${files.map(() => '?').join(',')})`,
    )
    .all(...files);
  res.json({ impacted: rows.map((r: any) => r.dst) });
});
app.listen(process.env.PORT || 4030);
