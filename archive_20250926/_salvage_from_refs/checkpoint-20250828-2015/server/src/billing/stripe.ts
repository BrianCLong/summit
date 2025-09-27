import Stripe from 'stripe';
import { BillingProvider } from './provider';
import { Pool } from 'pg';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' } as any);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export class StripeBilling implements BillingProvider {
  
  async createOrUpdateTenant(tenantId: string, metadata: { name?: string; email?: string }): Promise<void> {
    // Check if customer already exists
    const existing = await stripe.customers.list({ email: metadata.email, limit: 1 });
    if (existing.data.length > 0) {
      // Update customer metadata
      await stripe.customers.update(existing.data[0].id, { metadata: { tenantId } });
    } else {
      // Create a new customer
      await stripe.customers.create({
        email: metadata.email,
        name: metadata.name,
        metadata: { tenantId },
      });
    }
  }

  async invoice(tenantId: string, start: Date, end: Date): Promise<{ url?: string; bytes?: Buffer }> {
    // 1. Get usage data from local PG database
    const usageRes = await pool.query(
      `SELECT feature, sum(amount) AS total_usage FROM usage_event WHERE tenant_id=$1 AND ts BETWEEN $2 AND $3 GROUP BY feature`,
      [tenantId, start, end]
    );

    // 2. Find the Stripe customer ID
    const customer = (await stripe.customers.list({ metadata: { tenantId } })).data[0];
    if (!customer) throw new Error(`No Stripe customer found for tenant ${tenantId}`);

    // 3. Create invoice items for each usage feature
    for (const item of usageRes.rows) {
      // This requires that you have products and prices set up in Stripe
      // that correspond to your 'feature' strings.
      const price = (await stripe.prices.list({ lookup_keys: [item.feature], limit: 1 })).data[0];
      if (price) {
        await stripe.invoiceItems.create({
          customer: customer.id,
          price: price.id,
          quantity: item.total_usage,
          description: `Usage for ${item.feature} from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`,
        });
      }
    }

    // 4. Create and finalize the invoice
    const invoice = await stripe.invoices.create({
      customer: customer.id,
      auto_advance: true, // Automatically charge the customer
      collection_method: 'charge_automatically',
    });

    await stripe.invoices.finalizeInvoice(invoice.id);
    const finalizedInvoice = await stripe.invoices.retrieve(invoice.id);

    return { url: finalizedInvoice.hosted_invoice_url || undefined };
  }
}
