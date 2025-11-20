import express from 'express';
import bodyParser from 'body-parser';
import { buildWallet, disclose, verifyDisclosure } from './wallet';
const app = express();
app.use(bodyParser.json({ limit: '10mb' }));
const PRIV = process.env.PRIVATE_KEY_PEM || '';
const PUB = process.env.PUBLIC_KEY_PEM || '';
if (!PRIV)
    console.warn('[KPW] PRIVATE_KEY_PEM not set (server will not sign)');
app.post('/kpw/build', (req, res) => {
    const { runId, caseId, steps } = req.body;
    const out = buildWallet(runId, caseId, steps, PRIV);
    res.json(out); // {manifest, steps, leaves}
});
app.post('/kpw/disclose', (req, res) => {
    const { manifest, steps, leaves, stepIds } = req.body;
    const bundle = disclose(stepIds, manifest, steps, leaves);
    res.json(bundle);
});
app.post('/kpw/verify', (req, res) => {
    const { bundle } = req.body;
    const ok = verifyDisclosure(bundle, PUB);
    res.json({ ok });
});
const port = Number(process.env.PORT || 7102);
app.listen(port, () => console.log(`KPW-Media server on ${port}`));
