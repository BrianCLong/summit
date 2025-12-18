import express from 'express';
import bodyParser from 'body-parser';
import crypto from 'crypto';

interface LedgerEvent {
  eventId: string;
  type: string;
  timestamp: string;
  payload: any;
  prevHash: string;
  merkleHash: string;
  signature: string;
  signer: string;
}

const chain: LedgerEvent[] = [];

function computeMerkleHash(evt: Partial<LedgerEvent>): string {
  const s = JSON.stringify({
    type: evt.type,
    timestamp: evt.timestamp,
    payload: evt.payload,
    prevHash: evt.prevHash,
  });
  return crypto.createHash('sha256').update(s).digest('hex');
}

function signHash(hash: string, privPem: string): string {
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(hash);
  return sign.sign(privPem, 'base64');
}

const PRIV = process.env.LEDGER_PRIVATE_PEM || '';
const _PUB = process.env.LEDGER_PUBLIC_PEM || ''; // Reserved for signature verification

export const app: express.Application = express(); // Export app for testing
app.use(bodyParser.json());

app.post('/ledger/append', (req, res) => {
  const { type, payload, signer } = req.body;
  const prev = chain.length ? chain[chain.length - 1].merkleHash : '';
  const timestamp = new Date().toISOString();
  const merkleHash = computeMerkleHash({
    type,
    timestamp,
    payload,
    prevHash: prev,
  });
  const signature = signHash(merkleHash, PRIV);
  const ev: LedgerEvent = {
    eventId: crypto.randomUUID(),
    type,
    timestamp,
    payload,
    prevHash: prev,
    merkleHash,
    signature,
    signer,
  };
  chain.push(ev);
  res.json(ev);
});

app.get('/ledger/range', (req, res) => {
  const { from = 0, to = chain.length } = req.query;
  res.json(chain.slice(Number(from), Number(to)));
});

app.get('/ledger/last', (req, res) => {
  res.json(chain[chain.length - 1] || null);
});

const port = Number(process.env.PORT || 7401);
app.listen(port, () => {
  // Ledger server listening on port
});
