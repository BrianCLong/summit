import express from 'express';
const r = express.Router();
let current = 1;
r.get('/schema/version', (_req, res) => res.json({ version: current }));
export default r;
