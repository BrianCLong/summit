import express from 'express';
import fs from 'fs';
import crypto from 'crypto';
const app = express();
const b = fs.readFileSync('bundle.tar.gz');
const sig = crypto.createHash('sha256').update(b).digest('hex');
app.get('/bundle', (_, _res, next) => next());
app.get('/bundle.sha256', (_, res) => res.type('text/plain').send(sig));
app.use('/bundle', (req, res) => {
  res.type('application/gzip').send(b);
});
app.listen(process.env.PORT || 4090);
