import { loadConfig } from "./config.js";
import { OpaClient } from "./opaClient.js";
import { AppendOnlyLedger } from "./ledger.js";
import { ComplianceEvaluator } from "./evaluator.js";
import { createServer } from "./server.js";

async function main() {
  const cfg = loadConfig();
  const opa = new OpaClient(cfg.opaUrl);
  const ledger = new AppendOnlyLedger(cfg.ledgerPath);
  const evaluator = new ComplianceEvaluator(opa, ledger);

  const { app, logger } = createServer(evaluator);

  app.listen(cfg.port, () => {
    logger.info(
      { port: cfg.port, opaUrl: cfg.opaUrl, ledger: cfg.ledgerPath },
      "compliance-evaluator listening"
    );
  });
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
