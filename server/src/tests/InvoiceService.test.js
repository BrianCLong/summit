"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const InvoiceService_js_1 = require("../payments/InvoiceService.js");
(0, globals_1.describe)('InvoiceService', () => {
    let service;
    (0, globals_1.beforeEach)(() => {
        service = new InvoiceService_js_1.InvoiceService();
    });
    (0, globals_1.describe)('createInvoice', () => {
        (0, globals_1.it)('should create invoice with correct totals', async () => {
            const invoice = await service.createInvoice({
                customerId: 'cust_123',
                lineItems: [
                    { description: 'Pro Plan', quantity: 1, unitAmount: 9900 },
                    { description: 'Extra Users', quantity: 5, unitAmount: 1000 },
                ],
            });
            (0, globals_1.expect)(invoice.id).toMatch(/^inv_/);
            (0, globals_1.expect)(invoice.subtotal).toBe(14900);
            (0, globals_1.expect)(invoice.total).toBe(14900);
            (0, globals_1.expect)(invoice.status).toBe('draft');
            (0, globals_1.expect)(invoice.lineItems).toHaveLength(2);
        });
        (0, globals_1.it)('should apply tax correctly', async () => {
            service.setDefaultTax({
                rate: 0.1,
                inclusive: false,
                jurisdiction: 'CA',
            });
            const invoice = await service.createInvoice({
                customerId: 'cust_tax',
                lineItems: [{ description: 'Service', quantity: 1, unitAmount: 10000 }],
            });
            (0, globals_1.expect)(invoice.subtotal).toBe(10000);
            (0, globals_1.expect)(invoice.tax).toBe(1000);
            (0, globals_1.expect)(invoice.total).toBe(11000);
        });
    });
    (0, globals_1.describe)('invoice lifecycle', () => {
        (0, globals_1.it)('should finalize and mark paid', async () => {
            const invoice = await service.createInvoice({
                customerId: 'cust_lifecycle',
                lineItems: [{ description: 'Item', quantity: 1, unitAmount: 5000 }],
            });
            const finalized = await service.finalizeInvoice(invoice.id);
            (0, globals_1.expect)(finalized.status).toBe('open');
            const paid = await service.markPaid(invoice.id);
            (0, globals_1.expect)(paid.status).toBe('paid');
            (0, globals_1.expect)(paid.paidAt).toBeDefined();
        });
        (0, globals_1.it)('should void draft invoice', async () => {
            const invoice = await service.createInvoice({
                customerId: 'cust_void',
                lineItems: [{ description: 'Item', quantity: 1, unitAmount: 1000 }],
            });
            const voided = await service.voidInvoice(invoice.id);
            (0, globals_1.expect)(voided.status).toBe('void');
        });
        (0, globals_1.it)('should not void paid invoice', async () => {
            const invoice = await service.createInvoice({
                customerId: 'cust_paid',
                lineItems: [{ description: 'Item', quantity: 1, unitAmount: 1000 }],
            });
            await service.finalizeInvoice(invoice.id);
            await service.markPaid(invoice.id);
            await (0, globals_1.expect)(service.voidInvoice(invoice.id)).rejects.toThrow('cannot_void_paid_invoice');
        });
    });
    (0, globals_1.describe)('listInvoices', () => {
        (0, globals_1.it)('should list customer invoices sorted by date', async () => {
            const customerId = 'cust_list';
            await service.createInvoice({
                customerId,
                lineItems: [{ description: 'First', quantity: 1, unitAmount: 100 }],
            });
            await service.createInvoice({
                customerId,
                lineItems: [{ description: 'Second', quantity: 1, unitAmount: 200 }],
            });
            const invoices = await service.listInvoices(customerId);
            (0, globals_1.expect)(invoices).toHaveLength(2);
        });
    });
});
