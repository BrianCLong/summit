import { OpaClient } from './opaClient.js';
import { AppendOnlyLedger } from './ledger.js';
import { ComplianceEvaluator } from './evaluator.js';
import { createServer } from './server.js';

const OPA_URL = process.env.OPA_URL || 'http://localhost:8181';
const LEDGER_PATH = process.env.LEDGER_PATH || './data/attestations.ndjson';
const PORT = parseInt(process.env.PORT || '3002', 10);

const opa = new OpaClient(OPA_URL);
const ledger = new AppendOnlyLedger(LEDGER_PATH);
const evaluator = new ComplianceEvaluator(opa, ledger);

const { app, logger } = createServer(evaluator);

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'compliance-evaluator started');
});
