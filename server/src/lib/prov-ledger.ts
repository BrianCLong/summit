import { createProvLedgerClient } from '../prov-ledger-client/index.js';
import { cfg } from '../config.js';

export const provLedgerClient = createProvLedgerClient({
  baseURL: cfg.PROV_LEDGER_URL as string,
  authorityId: cfg.PROV_LEDGER_AUTHORITY_ID as string,
  reasonForAccess: cfg.PROV_LEDGER_REASON as string,
  timeout: 5000,
  retries: 3,
});
