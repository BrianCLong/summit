const { Flags } = require('../../../../libs/ops/src/flags.js');
const { buildProvLedgerApp } = require('./app.js');

const port = Number(process.env.PORT || 7011);
const flagEnabled = process.env.FLAG_PROV_LEDGER === '1' || Flags.provLedger;

if (!flagEnabled) {
  process.exit(0);
}

(async () => {
  const { app } = await buildProvLedgerApp();
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`prov-ledger up on ${port}`);
  });
})();
