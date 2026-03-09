import { Budget } from '../../ai/llmBudget.js';
import { getBudgetLedgerManager } from '../../src/db/budgetLedger.js';
import { Pool } from 'pg';

// We mock the DB pool or used a test DB. For this verification, we'll assume a test environment with a DB.
describe('Persistent LLM Budgeting', () => {
    let budget: Budget;
    const tenantId = 'TEST_TENANT_PHASE_8';

    beforeAll(async () => {
        budget = new Budget(100, 0.8, tenantId);
        // Ensure test tenant exists in DB or mock it
    });

    it('should charge budget and persist to DB', async () => {
        const initialUtil = await budget.getUtilization();
        await budget.charge(5.0, 'Test Task Charge');

        const newUtil = await budget.getUtilization();
        expect(newUtil).toBeGreaterThan(initialUtil);

        const transactions = await budget.getTransactions();
        expect(transactions.some(t => t.description === 'Test Task Charge')).toBe(true);
    });

    it('should survival service restart (instantiating new Budget object)', async () => {
        const budget2 = new Budget(100, 0.8, tenantId);
        const util = await budget2.getUtilization();
        expect(util).toBeGreaterThan(0); // Should be loaded from DB
    });

    it('should respect soft and hard limits via utilization check', async () => {
        const canAfford = await budget.canAfford(200);
        expect(canAfford).toBe(false);
    });
});
