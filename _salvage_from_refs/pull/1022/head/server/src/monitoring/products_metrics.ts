import { Counter } from 'prom-client';

export const entitlementIssued = new Counter({
  name: 'entitlement_issued_total',
  help: 'Entitlements issued'
});
