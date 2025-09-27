import { CostModel } from '../billing/CostModel';
import { Exporter } from '../billing/Exporter';
import fs from 'fs';

describe('Metering to Billing', () => {
  it('calculates cost and exports csv', async () => {
    const model = new CostModel({ api: 1, compute: 0.5 });
    const cost = model.cost({ apiCalls: 2, computeSeconds: 4 });
    expect(cost).toBe(4);
    const exporter = new Exporter();
    process.env.ENABLE_BILLING_EXPORT = 'true';
    await exporter.export([{ tenant: 't1', cost, usageType: 'api', value: 2 }], '/tmp/bill.csv');
    expect(fs.readFileSync('/tmp/bill.csv', 'utf8')).toContain('api');
  });
});
