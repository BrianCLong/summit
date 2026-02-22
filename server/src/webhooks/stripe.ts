import Stripe from 'stripe';
import QuotaManager from '../lib/resources/quota-manager.js';
import { neo } from '../db/neo4j.js';
import logger from '../config/logger.js';

export async function handleStripeWebhook(event: Stripe.Event) {
  const { type, data } = event;
  const object = data.object as any;

  switch (type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const tenantId = object.metadata?.tenantId;
      if (!tenantId) {
        logger.warn({ subscriptionId: object.id, type }, 'Stripe subscription missing tenantId metadata');
        return;
      }

      // Check metadata first, then fall back to price ID
      const planMeta = object.metadata?.plan;
      const priceId = object.items?.data[0]?.price?.id;

      let tier: 'PRO' | 'ENTERPRISE' = 'PRO';

      if (planMeta === 'ent' || priceId === process.env.STRIPE_PRICE_ENT || priceId === 'price_ent') {
        tier = 'ENTERPRISE';
      }

      logger.info({ tenantId, tier, type }, 'Syncing tenant subscription state');

      QuotaManager.setTenantTier(tenantId, tier);

      const quota = QuotaManager.getQuotaForTier(tier);
      await neo.run(
        `
        MERGE (o:Organization {tenantId: $tenantId})
        SET o.plan = $tier,
            o.seatCap = $seatCap,
            o.updatedAt = datetime(),
            o.stripeSubscriptionId = $subId
        `,
        {
          tenantId,
          tier,
          seatCap: quota.seatCap,
          subId: object.id
        }
      );

      logger.info({ tenantId, tier }, 'Tenant limits and RBAC synced to IntelGraph');
      break;
    }

    case 'customer.subscription.deleted': {
      const tenantId = object.metadata?.tenantId;
      if (!tenantId) return;

      logger.info({ tenantId }, 'Downgrading tenant due to subscription deletion');
      QuotaManager.setTenantTier(tenantId, 'FREE');

      await neo.run(
        `
        MATCH (o:Organization {tenantId: $tenantId})
        SET o.plan = 'FREE',
            o.seatCap = 5,
            o.updatedAt = datetime()
        `,
        { tenantId }
      );
      break;
    }

    default:
      logger.debug({ type }, 'Unhandled Stripe event type');
  }
}
