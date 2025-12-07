import { UsageMeteringService } from '../services/UsageMeteringService.js';
import { QuotaService } from '../services/QuotaService.js';
import { PricingEngine } from '../services/PricingEngine.js';
import { getPostgresPool, connectPostgres, closeConnections } from '../config/database.js';

// Simple script to test the flow end-to-end against a real DB (if running in an env with DB)
// or just to compile and check types.

async function main() {
    console.log('Starting Usage Billing Test...');

    try {
        await connectPostgres();
        const pool = getPostgresPool();

        // 1. Setup Data
        const tenantId = 'test-tenant-' + Date.now();
        console.log(`Using Tenant: ${tenantId}`);

        // Create a plan
        const planRes = await pool.query(
            `INSERT INTO plans (name, limits) VALUES ($1, $2) RETURNING id`,
            ['Test Plan ' + Date.now(), JSON.stringify({
                'test.tokens': { hardCap: 1000, monthlyIncluded: 100, unitPrice: 0.01, softThresholds: [800] }
            })]
        );
        const planId = planRes.rows[0].id;

        // Assign plan
        await pool.query(
            `INSERT INTO tenant_plans (tenant_id, plan_id) VALUES ($1, $2)`,
            [tenantId, planId]
        );

        // 2. Test Metering
        console.log('Recording usage...');
        await UsageMeteringService.record({
            tenantId,
            kind: 'test.tokens',
            quantity: 500,
            unit: 'tokens'
        });
        await UsageMeteringService.record({
            tenantId,
            kind: 'test.tokens',
            quantity: 300,
            unit: 'tokens'
        });

        // 3. Test Quota
        console.log('Checking quota...');
        // Current usage should be 800. Cap is 1000.
        // Request 100 -> Total 900. Allowed.
        const res1 = await QuotaService.checkQuota({
            tenantId,
            kind: 'test.tokens',
            quantity: 100
        });
        console.log('Quota Check 1 (100 tokens):', res1.allowed ? 'PASS' : 'FAIL', res1);

        // Request 300 -> Total 1100. Denied.
        const res2 = await QuotaService.checkQuota({
            tenantId,
            kind: 'test.tokens',
            quantity: 300
        });
        console.log('Quota Check 2 (300 tokens):', !res2.allowed ? 'PASS' : 'FAIL', res2);

        // 4. Test Pricing / Invoice
        console.log('Generating Invoice...');
        // We need to populate usage_summaries manually because we don't have the background job running
        const start = new Date();
        start.setDate(1);
        start.setHours(0,0,0,0);
        const end = new Date(); // now

        await pool.query(
            `INSERT INTO usage_summaries (tenant_id, period_start, period_end, kind, total_quantity, unit)
             VALUES ($1, $2, $3, 'test.tokens', 800, 'tokens')`,
             [tenantId, start.toISOString(), end.toISOString()]
        );

        const invoice = await PricingEngine.generateInvoice(tenantId, start.toISOString(), end.toISOString());
        console.log('Invoice generated:', invoice.total > 0 ? 'PASS' : 'FAIL', invoice.total);
        console.log('Invoice Items:', JSON.stringify(invoice.lineItems, null, 2));

    } catch (e) {
        console.error('Test Failed:', e);
    } finally {
        await closeConnections();
    }
}

if (process.argv[1] === import.meta.filename) {
    main();
}
