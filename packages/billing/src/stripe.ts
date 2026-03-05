import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET || '', {
  apiVersion: '2024-04-10' as any,
});

export async function createCheckout(tenantId: string, plan: 'pro' | 'ent') {
  return stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [
      {
        price: plan === 'pro' ? (process.env.STRIPE_PRICE_PRO || 'price_pro') : (process.env.STRIPE_PRICE_ENT || 'price_ent'),
        quantity: 1,
      },
    ],
    metadata: { tenantId, plan },
    subscription_data: {
      metadata: { tenantId, plan },
    },
    success_url: `${process.env.FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/billing/cancel`,
  });
}
