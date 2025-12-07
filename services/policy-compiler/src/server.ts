import express from 'express';
import { middleware, PolicyCompiler } from './index';

const app = express();
const compiler = new PolicyCompiler();
app.use(express.json());
app.get('/healthz', (_req, res) => {
  res.json({ ok: true, service: 'policy-compiler' });
});
app.use('/policies/demo', middleware('demo', compiler));

const port = process.env.PORT || 8080;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`policy-compiler listening on ${port}`);
});
