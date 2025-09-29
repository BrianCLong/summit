import { TransparencyService } from "../../transparency/TransparencyService";

const skus = [
  { id: "hist", name: "DP Histogram", templateId: "dp_histogram", epsilonTiers: [0.5,1], region: ["us","eu"], ttlDays: 30 },
  { id: "topk", name: "DP TopK", templateId: "dp_topk", epsilonTiers: [0.5,1], region: ["us","eu"], ttlDays: 30 }
];

const orders: any[] = [];
const transparency = new TransparencyService();

export const marketplaceResolvers = {
  Query: {
    skus: () => skus,
    orders: (_: any, { tenantId }: any) => orders.filter(o => o.tenantId === tenantId),
    entitlementProof: (_: any, { entitlementId }: any) => transparency.proof(entitlementId)
  },
  Mutation: {
    buySku: (_: any, { tenantId, skuId, epsilonCap, region }: any) => {
      const sku = skus.find(s => s.id === skuId);
      if (!sku) throw new Error("sku-not-found");
      const id = `ord-${Date.now()}`;
      const entitlementId = `ent-${Date.now()}`;
      const order = { id, skuId, entitlementId, tenantId, epsilonCap, region, expiresAt: new Date(Date.now()+sku.ttlDays*86400000).toISOString(), status: "active" };
      orders.push(order);
      transparency.append({ id: entitlementId, type: "issue", entitlementId, payload: order, ts: Date.now() });
      return order;
    },
    revokeEntitlement: (_: any, { entitlementId }: any) => {
      const order = orders.find(o => o.entitlementId === entitlementId);
      if (order) {
        order.status = "revoked";
        transparency.append({ id: `rev-${entitlementId}`, type: "revoke", entitlementId, payload: {}, ts: Date.now() });
        return true;
      }
      return false;
    }
  }
};
