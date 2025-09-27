import { ApolloServerPlugin } from '@apollo/server';
import { DEFAULT_PLANS, EntitlementMap, Limit } from './plans';
import { budgeter } from './budgeter';
import { pool } from '../db/pg';
import { publish } from '../stream/kafka'; // Assuming Kafka producer is available

// Helper to match a feature against a rule (e.g., 'graph.query' matches 'graph.*')
function matchFeature(rule: string, feature: string): boolean {
  if (rule.endsWith('.*')) {
    return feature.startsWith(rule.slice(0, -1));
  }
  return rule === feature;
}

// Caching layer for tenant plans to reduce DB lookups per request.
const planCache = new Map<string, { plan: string, overrides: EntitlementMap, fetchedAt: number }>();

async function getTenantPlan(tenantId: string): Promise<{ plan: string, overrides: EntitlementMap }> {
  const cached = planCache.get(tenantId);
  if (cached && (Date.now() - cached.fetchedAt < 60000)) { // 1-minute cache
    return cached;
  }

  try {
    const res = await pool.query('SELECT plan_id, overrides FROM tenant_plan WHERE tenant_id = $1', [tenantId]);
    if (res.rows.length > 0) {
      const plan = { plan: res.rows[0].plan_id, overrides: res.rows[0].overrides || {} };
      planCache.set(tenantId, { ...plan, fetchedAt: Date.now() });
      return plan;
    }
  } catch (e) {
    console.error('Failed to fetch tenant plan from DB', e);
  }

  // Fallback to default plan
  const defaultPlan = { plan: process.env.DEFAULT_PLAN || 'free', overrides: {} };
  planCache.set(tenantId, { ...defaultPlan, fetchedAt: Date.now() });
  return defaultPlan;
}

async function getLimits(tenantId: string, feature: string): Promise<Limit> {
  const { plan, overrides } = await getTenantPlan(tenantId);
  
  // Check for a specific override for this feature first
  if (overrides[feature]) {
    return overrides[feature];
  }

  const planEntitlements = DEFAULT_PLANS[plan] || {};
  const matchingRule = Object.keys(planEntitlements).find(rule => matchFeature(rule, feature));
  
  return matchingRule ? planEntitlements[matchingRule] : {};
}

/**
 * An Apollo Server plugin that performs two functions:
 * 1. **Entitlements Check (pre-resolver):** Checks if the tenant has quota for the requested feature.
 * 2. **Metering (post-resolver):** Emits a usage event after a feature is successfully used.
 */
export const EntitlementsPlugin: ApolloServerPlugin = {
  async requestDidStart({ request, contextValue }) {
    const tenantId = (contextValue as any).tenantId;
    if (!tenantId) return; // Don't check/meter unauthenticated or system requests

    return {
      async willResolveField({ info }) {
        const feature = `${info.parentType.name}.${info.fieldName}`
          .replace(/^(Query|Mutation|Subscription)\./, '')
          .toLowerCase();

        // 1. Pre-check against limits
        const limits = await getLimits(tenantId, feature);
        if (await budgeter.isHardLimited(tenantId, feature, limits)) {
          throw Object.assign(new Error(`Quota exceeded for feature '${feature}'. Please see your Usage & Quotas dashboard.`), {
            extensions: { code: 'RESOURCE_EXHAUSTED' },
          });
        }

        // 2. Return a post-resolver hook to emit usage event
        return async () => {
          try {
            await publish('intelgraph.usage.v1', `${tenantId}:${feature}`,
              {
                tenantId,
                feature,
                amount: 1,
                ts: new Date().toISOString(),
                attrs: { gqlParent: info.parentType.name, gqlField: info.fieldName },
              }
            );
            // 3. Check if a warning toast should be sent to the user
            await budgeter.maybeWarn(tenantId, feature, limits);
          } catch (e) {
            console.error('Failed to publish usage event', e);
            // Best-effort, don't fail the request if Kafka is down.
          }
        };
      },
    };
  },
};
