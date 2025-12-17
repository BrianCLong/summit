import crypto from 'crypto';

export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitAmount: number;
  amount: number;
}

export interface Invoice {
  id: string;
  customerId: string;
  subscriptionId?: string;
  status: InvoiceStatus;
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  lineItems: InvoiceLineItem[];
  dueDate: Date;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaxConfig {
  rate: number;
  inclusive: boolean;
  jurisdiction: string;
}

export class InvoiceService {
  private invoices: Map<string, Invoice> = new Map();
  private defaultTax: TaxConfig = {
    rate: 0,
    inclusive: false,
    jurisdiction: 'US',
  };

  setDefaultTax(config: TaxConfig): void {
    this.defaultTax = config;
  }

  async createInvoice(params: {
    customerId: string;
    subscriptionId?: string;
    currency?: string;
    lineItems: Omit<InvoiceLineItem, 'amount'>[];
    dueInDays?: number;
  }): Promise<Invoice> {
    const lineItems: InvoiceLineItem[] = params.lineItems.map((item) => ({
      ...item,
      amount: item.quantity * item.unitAmount,
    }));

    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const tax = Math.round(subtotal * this.defaultTax.rate);
    const total = this.defaultTax.inclusive ? subtotal : subtotal + tax;

    const now = new Date();
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + (params.dueInDays || 30));

    const invoice: Invoice = {
      id: `inv_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`,
      customerId: params.customerId,
      subscriptionId: params.subscriptionId,
      status: 'draft',
      currency: (params.currency || 'usd').toLowerCase(),
      subtotal,
      tax,
      total,
      lineItems,
      dueDate,
      createdAt: now,
      updatedAt: now,
    };

    this.invoices.set(invoice.id, invoice);
    return invoice;
  }

  async finalizeInvoice(invoiceId: string): Promise<Invoice> {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) throw new Error('invoice_not_found');
    if (invoice.status !== 'draft') {
      throw new Error('invoice_already_finalized');
    }

    invoice.status = 'open';
    invoice.updatedAt = new Date();
    return invoice;
  }

  async markPaid(invoiceId: string): Promise<Invoice> {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) throw new Error('invoice_not_found');
    if (invoice.status !== 'open') {
      throw new Error('invoice_not_open');
    }

    invoice.status = 'paid';
    invoice.paidAt = new Date();
    invoice.updatedAt = new Date();
    return invoice;
  }

  async voidInvoice(invoiceId: string): Promise<Invoice> {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) throw new Error('invoice_not_found');
    if (invoice.status === 'paid') {
      throw new Error('cannot_void_paid_invoice');
    }

    invoice.status = 'void';
    invoice.updatedAt = new Date();
    return invoice;
  }

  async getInvoice(invoiceId: string): Promise<Invoice | null> {
    return this.invoices.get(invoiceId) || null;
  }

  async listInvoices(customerId: string): Promise<Invoice[]> {
    return Array.from(this.invoices.values())
      .filter((i) => i.customerId === customerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async listOverdue(): Promise<Invoice[]> {
    const now = new Date();
    return Array.from(this.invoices.values()).filter(
      (i) => i.status === 'open' && i.dueDate < now,
    );
  }

  async getRevenueStats(since: Date): Promise<{
    totalRevenue: number;
    invoiceCount: number;
    averageInvoice: number;
  }> {
    const paidInvoices = Array.from(this.invoices.values()).filter(
      (i) => i.status === 'paid' && i.paidAt && i.paidAt >= since,
    );

    const totalRevenue = paidInvoices.reduce((sum, i) => sum + i.total, 0);
    const invoiceCount = paidInvoices.length;

    return {
      totalRevenue,
      invoiceCount,
      averageInvoice: invoiceCount > 0 ? totalRevenue / invoiceCount : 0,
    };
  }
}

export default InvoiceService;
