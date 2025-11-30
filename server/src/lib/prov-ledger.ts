import { createProvLedgerClient } from '../prov-ledger-client/index.js';
import { cfg } from '../config.js';

export const provLedgerClient = createProvLedgerClient({
  baseURL: cfg.PROV_LEDGER_URL,
  authorityId: cfg.PROV_LEDGER_AUTHORITY_ID,
  reasonForAccess: cfg.PROV_LEDGER_REASON,
  timeout: 5000,
  retries: 3,
});
