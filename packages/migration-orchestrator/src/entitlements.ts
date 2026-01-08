import { deepEqual } from "./utils.ts";

export class EntitlementService {
  constructor() {
    this.entitlements = new Map();
    this.billingSnapshots = new Map();
    this.roleTemplates = new Map();
  }

  upsertRoleMapping(mapping) {
    this.roleTemplates.set(mapping.legacyRole, mapping);
  }

  upsertTenantEntitlements(payload) {
    this.entitlements.set(payload.tenantId, payload);
  }

  addBillingSnapshot(snapshot) {
    snapshot.lastReconciledAt = new Date();
    this.billingSnapshots.set(snapshot.tenantId, snapshot);
  }

  previewEntitlements(tenantId) {
    const entitlements = this.entitlements.get(tenantId);
    if (!entitlements) {
      throw new Error(`missing entitlements for ${tenantId}`);
    }
    return {
      ...entitlements,
      previewNotes: "Preview only - cutover blocked until billing reconciliation passes",
    };
  }

  reconcileBilling(tenantId) {
    const entitlements = this.entitlements.get(tenantId);
    const billing = this.billingSnapshots.get(tenantId);
    if (!entitlements || !billing) {
      return { ok: false, mismatches: ["missing-entitlements-or-billing"] };
    }
    const mismatches = entitlements.entitlements
      .filter((entitlement) => {
        const billingEntitlement = billing.entitlements.find((b) => b.name === entitlement.name);
        return !billingEntitlement || !deepEqual(billingEntitlement, entitlement);
      })
      .map((entitlement) => entitlement.name);
    return { ok: mismatches.length === 0, mismatches };
  }
}
