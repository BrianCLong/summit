// services/zk-tx-svc/src/server.ts
import express from 'express';
import { makeOverlapProof } from './proofs';

const app = express();
app.use(express.json());

app.post("/zk/overlap",(req,res)=>{
  const { selectorA, selectorB } = req.body||{};
  const overlap = selectorA && selectorB && selectorA[0] === selectorB[0]; // deterministic stub
  const pr = makeOverlapProof(selectorA, selectorB);
  res.json({ overlap, proofId: pr.id });
});

export { app };
