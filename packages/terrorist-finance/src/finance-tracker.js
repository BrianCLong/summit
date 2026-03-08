"use strict";
/**
 * Finance Tracker
 * Tracks terrorist financing flows and networks
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceTracker = void 0;
class FinanceTracker {
    entities = new Map();
    transactions = [];
    hawalaNetworks = new Map();
    cryptoActivities = new Map();
    frontCompanies = new Map();
    charities = new Map();
    extortionOps = [];
    kidnappings = [];
    drugTrafficking = [];
    stateSponsors = new Map();
    assetFreezes = new Map();
    sanctions = new Map();
    networks = new Map();
    launderingSchemes = new Map();
    /**
     * Track financial entity
     */
    async trackEntity(entity) {
        this.entities.set(entity.id, entity);
    }
    /**
     * Record transaction
     */
    async recordTransaction(transaction) {
        this.transactions.push(transaction);
        if (transaction.suspicious || transaction.flagged) {
            await this.analyzeTransaction(transaction);
        }
    }
    /**
     * Track hawala network
     */
    async trackHawalaNetwork(network) {
        this.hawalaNetworks.set(network.id, network);
    }
    /**
     * Monitor cryptocurrency activity
     */
    async monitorCryptoActivity(activity) {
        this.cryptoActivities.set(activity.entityId, activity);
    }
    /**
     * Identify front company
     */
    async identifyFrontCompany(company) {
        this.frontCompanies.set(company.id, company);
    }
    /**
     * Monitor charity operation
     */
    async monitorCharity(charity) {
        this.charities.set(charity.id, charity);
    }
    /**
     * Record extortion operation
     */
    async recordExtortion(operation) {
        this.extortionOps.push(operation);
    }
    /**
     * Record kidnapping for ransom
     */
    async recordKidnapping(kidnapping) {
        this.kidnappings.push(kidnapping);
    }
    /**
     * Track drug trafficking
     */
    async trackDrugTrafficking(trafficking) {
        this.drugTrafficking.push(trafficking);
    }
    /**
     * Track state sponsor
     */
    async trackStateSponsor(sponsor) {
        this.stateSponsors.set(sponsor.country, sponsor);
    }
    /**
     * Record asset freeze
     */
    async recordAssetFreeze(freeze) {
        const existing = this.assetFreezes.get(freeze.entityId) || [];
        existing.push(freeze);
        this.assetFreezes.set(freeze.entityId, existing);
        // Update entity status
        const entity = this.entities.get(freeze.entityId);
        if (entity) {
            entity.status = 'FROZEN';
        }
    }
    /**
     * Record sanction
     */
    async recordSanction(sanction) {
        const existing = this.sanctions.get(sanction.entityId) || [];
        existing.push(sanction);
        this.sanctions.set(sanction.entityId, existing);
        // Update entity
        const entity = this.entities.get(sanction.entityId);
        if (entity) {
            entity.sanctioned = true;
        }
    }
    /**
     * Identify financial network
     */
    async identifyNetwork(network) {
        this.networks.set(network.id, network);
    }
    /**
     * Identify laundering scheme
     */
    async identifyLaunderingScheme(scheme) {
        this.launderingSchemes.set(scheme.id, scheme);
    }
    /**
     * Query financial data
     */
    async query(query) {
        let filteredEntities = Array.from(this.entities.values());
        let filteredTransactions = [...this.transactions];
        if (query.entityTypes && query.entityTypes.length > 0) {
            filteredEntities = filteredEntities.filter(e => query.entityTypes.includes(e.type));
        }
        if (query.sanctioned !== undefined) {
            filteredEntities = filteredEntities.filter(e => e.sanctioned === query.sanctioned);
        }
        if (query.transactionMethods && query.transactionMethods.length > 0) {
            filteredTransactions = filteredTransactions.filter(t => query.transactionMethods.includes(t.method));
        }
        if (query.minAmount !== undefined) {
            filteredTransactions = filteredTransactions.filter(t => t.amount >= query.minAmount);
        }
        const totalFlow = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
        return {
            entities: filteredEntities,
            transactions: filteredTransactions,
            networks: Array.from(this.networks.values()),
            totalFlow,
            trends: this.calculateTrends()
        };
    }
    /**
     * Get entity funding sources
     */
    async getFundingSources(entityId) {
        return {
            extortion: this.extortionOps.filter(e => e.organizationId === entityId),
            kidnapping: this.kidnappings.filter(k => k.organizationId === entityId),
            drugTrafficking: this.drugTrafficking.filter(d => d.organizationId === entityId),
            stateSponsor: Array.from(this.stateSponsors.values()).find(s => s.recipients.includes(entityId)),
            frontCompanies: Array.from(this.frontCompanies.values()).filter(f => f.linked.includes(entityId)),
            charities: Array.from(this.charities.values()).filter(c => c.diversion && c.name.includes(entityId))
        };
    }
    /**
     * Trace transaction chain
     */
    async traceTransactionChain(transactionId) {
        const chain = [];
        const transaction = this.transactions.find(t => t.id === transactionId);
        if (!transaction) {
            return chain;
        }
        chain.push(transaction);
        // Find subsequent transactions (simplified)
        const related = this.transactions.filter(t => t.from === transaction.to && t.date > transaction.date);
        chain.push(...related);
        return chain;
    }
    /**
     * Calculate disruption impact
     */
    async calculateDisruptionImpact(entityId) {
        const entity = this.entities.get(entityId);
        if (!entity) {
            return { financialImpact: 0, networkImpact: 0, recommendation: 'Entity not found' };
        }
        // Calculate financial impact
        const relatedTransactions = this.transactions.filter(t => t.from === entityId || t.to === entityId);
        const financialImpact = relatedTransactions.reduce((sum, t) => sum + t.amount, 0);
        // Calculate network impact
        const connectedEntities = new Set(relatedTransactions.map(t => (t.from === entityId ? t.to : t.from)));
        const networkImpact = connectedEntities.size;
        const recommendation = entity.riskScore > 0.7
            ? 'High priority for disruption'
            : 'Consider for monitoring';
        return { financialImpact, networkImpact, recommendation };
    }
    /**
     * Private helper methods
     */
    async analyzeTransaction(transaction) {
        // Transaction analysis implementation
    }
    calculateTrends() {
        return [
            {
                type: 'Transaction Volume',
                direction: 'STABLE',
                magnitude: this.transactions.length,
                period: '30-days',
                description: `${this.transactions.length} transactions tracked`
            }
        ];
    }
}
exports.FinanceTracker = FinanceTracker;
