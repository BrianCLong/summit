"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleStripeWebhook = handleStripeWebhook;
const quota_manager_js_1 = __importDefault(require("../lib/resources/quota-manager.js"));
const neo4j_js_1 = require("../db/neo4j.js");
const logger_js_1 = __importDefault(require("../config/logger.js"));
async function handleStripeWebhook(event) {
    const { type, data } = event;
    const object = data.object;
    switch (type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
            const tenantId = object.metadata?.tenantId;
            if (!tenantId) {
                logger_js_1.default.warn({ subscriptionId: object.id, type }, 'Stripe subscription missing tenantId metadata');
                return;
            }
            // Check metadata first, then fall back to price ID
            const planMeta = object.metadata?.plan;
            const priceId = object.items?.data[0]?.price?.id;
            let tier = 'PRO';
            if (planMeta === 'ent' || priceId === process.env.STRIPE_PRICE_ENT || priceId === 'price_ent') {
                tier = 'ENTERPRISE';
            }
            logger_js_1.default.info({ tenantId, tier, type }, 'Syncing tenant subscription state');
            quota_manager_js_1.default.setTenantTier(tenantId, tier);
            const quota = quota_manager_js_1.default.getQuotaForTier(tier);
            await neo4j_js_1.neo.run(`
        MERGE (o:Organization {tenantId: $tenantId})
        SET o.plan = $tier,
            o.seatCap = $seatCap,
            o.updatedAt = datetime(),
            o.stripeSubscriptionId = $subId
        `, {
                tenantId,
                tier,
                seatCap: quota.seatCap,
                subId: object.id
            });
            logger_js_1.default.info({ tenantId, tier }, 'Tenant limits and RBAC synced to IntelGraph');
            break;
        }
        case 'customer.subscription.deleted': {
            const tenantId = object.metadata?.tenantId;
            if (!tenantId)
                return;
            logger_js_1.default.info({ tenantId }, 'Downgrading tenant due to subscription deletion');
            quota_manager_js_1.default.setTenantTier(tenantId, 'FREE');
            await neo4j_js_1.neo.run(`
        MATCH (o:Organization {tenantId: $tenantId})
        SET o.plan = 'FREE',
            o.seatCap = 5,
            o.updatedAt = datetime()
        `, { tenantId });
            break;
        }
        default:
            logger_js_1.default.debug({ type }, 'Unhandled Stripe event type');
    }
}
