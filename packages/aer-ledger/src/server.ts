import express from 'express'; import bodyParser from 'body-parser';
import { hash, sign, verify } from './crypto';
const app = express(); app.use(bodyParser.json({limit:'2mb'}));

const PRIV = process.env.AER_PRIVATE_KEY_PEM || ''; const PUB = process.env.AER_PUBLIC_KEY_PEM || '';

app.post('/aer/mint', (req,res)=>{
  const { assertion, subjectToken } = req.body;
  const assertionHash = hash(assertion);
  const epoch = Math.floor(Date.now()/1000);
  const sig = sign(assertionHash, epoch, subjectToken, PRIV);
  res.json({ assertionHash, epoch, subjectToken, ...sig });
});

app.post('/aer/verify', (req,res)=>{
  const { aer } = req.body;
  const ok = verify(aer, PUB);
  res.json({ ok });
});

app.listen(process.env.PORT||7201, ()=>console.log('AER ledger on 7201'));