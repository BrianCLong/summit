import express from 'express';

const app = express();
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(3000);
