"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantRegistry = void 0;
const crypto_1 = require("crypto");
const governance_kernel_1 = require("@intelgraph/governance-kernel");
class TenantRegistry {
    graphAdapter;
    tenants = new Map();
    constructor(graphAdapter) {
        this.graphAdapter = graphAdapter;
    }
    async createTenant(name, modules, region) {
        // Governance Check: Tenant Onboarding
        const govDecision = (0, governance_kernel_1.evaluateGovernancePolicy)('analytics', {
            tenantId: 'system',
            action: 'CREATE_TENANT',
            resource: name,
            params: { region, modules }
        });
        if (govDecision.outcome === 'DENIED') {
            throw new Error(`Tenant creation denied: ${govDecision.reason}`);
        }
        const tenant = {
            id: (0, crypto_1.randomUUID)(),
            name,
            modules,
            region,
            slaTier: 'STANDARD',
            createdAt: new Date()
        };
        this.tenants.set(tenant.id, tenant);
        // Add to Graph
        await this.graphAdapter.addNode({
            id: tenant.id,
            label: 'Tenant',
            properties: { name: tenant.name, region: tenant.region }
        });
        return tenant;
    }
    getTenant(id) {
        return this.tenants.get(id);
    }
    listTenants() {
        return Array.from(this.tenants.values());
    }
}
exports.TenantRegistry = TenantRegistry;
