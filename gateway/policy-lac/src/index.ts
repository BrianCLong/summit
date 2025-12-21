import express, { RequestHandler } from 'express';
import { fileURLToPath } from 'url';

export const app = express();
app.use(express.json());

type ExplainResponse = {
  allowed: boolean;
  reason: string;
  violations: string[];
  input: unknown;
};

const unsafeOperations = ['dangerousOp', 'drop', 'deleteAll'];

const explainHandler: RequestHandler = (req, res) => {
  const requestBody = req.body ?? {};
  const queryText = typeof requestBody.query === 'string' ? requestBody.query : '';
  const violations = unsafeOperations.filter((op) => queryText.includes(op));
  const allowed = violations.length === 0;
  const response: ExplainResponse = {
    allowed,
    reason: allowed ? 'Allowed: no violations detected' : `Denied: ${violations.join(', ')} prohibited`,
    violations,
    input: requestBody
  };
  res.json(response);
};

app.post('/policy/explain', explainHandler);

app.get('/health', (_, res) => res.send('ok'));

const entrypoint = fileURLToPath(import.meta.url);
if (process.argv[1] === entrypoint) {
  app.listen(4000, () => console.log('[policy-lac] listening on 4000'));
}

export default app;
