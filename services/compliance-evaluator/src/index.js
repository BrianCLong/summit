"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const opaClient_js_1 = require("./opaClient.js");
const ledger_js_1 = require("./ledger.js");
const evaluator_js_1 = require("./evaluator.js");
const server_js_1 = require("./server.js");
const OPA_URL = process.env.OPA_URL || 'http://localhost:8181';
const LEDGER_PATH = process.env.LEDGER_PATH || './data/attestations.ndjson';
const PORT = parseInt(process.env.PORT || '3002', 10);
const opa = new opaClient_js_1.OpaClient(OPA_URL);
const ledger = new ledger_js_1.AppendOnlyLedger(LEDGER_PATH);
const evaluator = new evaluator_js_1.ComplianceEvaluator(opa, ledger);
const { app, logger } = (0, server_js_1.createServer)(evaluator);
app.listen(PORT, () => {
    logger.info({ port: PORT }, 'compliance-evaluator started');
});
