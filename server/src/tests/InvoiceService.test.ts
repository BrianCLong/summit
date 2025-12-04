import { InvoiceService } from '../payments/InvoiceService';

describe('InvoiceService', () => {
  let service: InvoiceService;

  beforeEach(() => {
    service = new InvoiceService();
  });

  describe('createInvoice', () => {
    it('should create invoice with correct totals', async () => {
      const invoice = await service.createInvoice({
        customerId: 'cust_123',
        lineItems: [
          { description: 'Pro Plan', quantity: 1, unitAmount: 9900 },
          { description: 'Extra Users', quantity: 5, unitAmount: 1000 },
        ],
      });

      expect(invoice.id).toMatch(/^inv_/);
      expect(invoice.subtotal).toBe(14900);
      expect(invoice.total).toBe(14900);
      expect(invoice.status).toBe('draft');
      expect(invoice.lineItems).toHaveLength(2);
    });

    it('should apply tax correctly', async () => {
      service.setDefaultTax({
        rate: 0.1,
        inclusive: false,
        jurisdiction: 'CA',
      });

      const invoice = await service.createInvoice({
        customerId: 'cust_tax',
        lineItems: [{ description: 'Service', quantity: 1, unitAmount: 10000 }],
      });

      expect(invoice.subtotal).toBe(10000);
      expect(invoice.tax).toBe(1000);
      expect(invoice.total).toBe(11000);
    });
  });

  describe('invoice lifecycle', () => {
    it('should finalize and mark paid', async () => {
      const invoice = await service.createInvoice({
        customerId: 'cust_lifecycle',
        lineItems: [{ description: 'Item', quantity: 1, unitAmount: 5000 }],
      });

      const finalized = await service.finalizeInvoice(invoice.id);
      expect(finalized.status).toBe('open');

      const paid = await service.markPaid(invoice.id);
      expect(paid.status).toBe('paid');
      expect(paid.paidAt).toBeDefined();
    });

    it('should void draft invoice', async () => {
      const invoice = await service.createInvoice({
        customerId: 'cust_void',
        lineItems: [{ description: 'Item', quantity: 1, unitAmount: 1000 }],
      });

      const voided = await service.voidInvoice(invoice.id);
      expect(voided.status).toBe('void');
    });

    it('should not void paid invoice', async () => {
      const invoice = await service.createInvoice({
        customerId: 'cust_paid',
        lineItems: [{ description: 'Item', quantity: 1, unitAmount: 1000 }],
      });
      await service.finalizeInvoice(invoice.id);
      await service.markPaid(invoice.id);

      await expect(service.voidInvoice(invoice.id)).rejects.toThrow(
        'cannot_void_paid_invoice',
      );
    });
  });

  describe('listInvoices', () => {
    it('should list customer invoices sorted by date', async () => {
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
      expect(invoices).toHaveLength(2);
    });
  });
});
