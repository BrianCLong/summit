import { createServer } from './server.js';

const port = Number(process.env.PROV_LEDGER_PORT || 4201);
createServer().then(app => {
  app.listen(port, () => {
    console.log(`prov-ledger listening on :${port}`);
  });
}).catch(err => {
  console.error('failed to start prov-ledger', err);
  process.exit(1);
});
