"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceService = void 0;
const crypto_1 = __importDefault(require("crypto"));
class InvoiceService {
    invoices = new Map();
    defaultTax = {
        rate: 0,
        inclusive: false,
        jurisdiction: 'US',
    };
    setDefaultTax(config) {
        this.defaultTax = config;
    }
    async createInvoice(params) {
        const lineItems = params.lineItems.map((item) => ({
            ...item,
            amount: item.quantity * item.unitAmount,
        }));
        const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
        const tax = Math.round(subtotal * this.defaultTax.rate);
        const total = this.defaultTax.inclusive ? subtotal : subtotal + tax;
        const now = new Date();
        const dueDate = new Date(now);
        dueDate.setDate(dueDate.getDate() + (params.dueInDays || 30));
        const invoice = {
            id: `inv_${crypto_1.default.randomUUID().replace(/-/g, '').slice(0, 24)}`,
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
    async finalizeInvoice(invoiceId) {
        const invoice = this.invoices.get(invoiceId);
        if (!invoice)
            throw new Error('invoice_not_found');
        if (invoice.status !== 'draft') {
            throw new Error('invoice_already_finalized');
        }
        invoice.status = 'open';
        invoice.updatedAt = new Date();
        return invoice;
    }
    async markPaid(invoiceId) {
        const invoice = this.invoices.get(invoiceId);
        if (!invoice)
            throw new Error('invoice_not_found');
        if (invoice.status !== 'open') {
            throw new Error('invoice_not_open');
        }
        invoice.status = 'paid';
        invoice.paidAt = new Date();
        invoice.updatedAt = new Date();
        return invoice;
    }
    async voidInvoice(invoiceId) {
        const invoice = this.invoices.get(invoiceId);
        if (!invoice)
            throw new Error('invoice_not_found');
        if (invoice.status === 'paid') {
            throw new Error('cannot_void_paid_invoice');
        }
        invoice.status = 'void';
        invoice.updatedAt = new Date();
        return invoice;
    }
    async getInvoice(invoiceId) {
        return this.invoices.get(invoiceId) || null;
    }
    async listInvoices(customerId) {
        return Array.from(this.invoices.values())
            .filter((i) => i.customerId === customerId)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    async listOverdue() {
        const now = new Date();
        return Array.from(this.invoices.values()).filter((i) => i.status === 'open' && i.dueDate < now);
    }
    async getRevenueStats(since) {
        const paidInvoices = Array.from(this.invoices.values()).filter((i) => i.status === 'paid' && i.paidAt && i.paidAt >= since);
        const totalRevenue = paidInvoices.reduce((sum, i) => sum + i.total, 0);
        const invoiceCount = paidInvoices.length;
        return {
            totalRevenue,
            invoiceCount,
            averageInvoice: invoiceCount > 0 ? totalRevenue / invoiceCount : 0,
        };
    }
}
exports.InvoiceService = InvoiceService;
exports.default = InvoiceService;
