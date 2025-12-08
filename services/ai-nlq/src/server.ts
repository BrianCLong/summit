// services/ai-nlq/src/server.ts
import express from 'express';
import { safe, runSandbox } from './sandbox';

const app = express();
app.use(express.json());

app.post("/sandbox/run",(req,res)=>{
  const { cypher } = req.body||{};
  const s = safe(cypher||"");
  if(!s.ok) return res.status(400).json({ error: s.reason });
  return res.json({ rows: runSandbox(cypher) });
});

export { app };
