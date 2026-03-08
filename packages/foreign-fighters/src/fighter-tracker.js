"use strict";
/**
 * Fighter Tracker
 * Tracks foreign fighters and returnees
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FighterTracker = void 0;
class FighterTracker {
    fighters = new Map();
    returnees = new Map();
    networks = new Map();
    veteranNetworks = new Map();
    skillsTransfers = [];
    borderAlerts = [];
    /**
     * Track a foreign fighter
     */
    async trackFighter(fighter) {
        this.fighters.set(fighter.id, fighter);
    }
    /**
     * Register returnee profile
     */
    async registerReturnee(profile) {
        this.returnees.set(profile.fighterId, profile);
        // Update fighter status
        const fighter = this.fighters.get(profile.fighterId);
        if (fighter) {
            fighter.status = 'RETURNED';
        }
    }
    /**
     * Track fighter network
     */
    async trackNetwork(network) {
        this.networks.set(network.id, network);
    }
    /**
     * Monitor veteran fighter network
     */
    async monitorVeteranNetwork(network) {
        const id = network.members.join('-');
        this.veteranNetworks.set(id, network);
    }
    /**
     * Record skills transfer
     */
    async recordSkillsTransfer(transfer) {
        this.skillsTransfers.push(transfer);
    }
    /**
     * Register border alert
     */
    async registerBorderAlert(alert) {
        this.borderAlerts.push(alert);
        // Update fighter journey
        const fighter = this.fighters.get(alert.fighterId);
        if (fighter && alert.detected) {
            // Update journey information based on alert type
        }
    }
    /**
     * Query fighters
     */
    async queryFighters(query) {
        let filtered = Array.from(this.fighters.values());
        if (query.status && query.status.length > 0) {
            filtered = filtered.filter(f => query.status.includes(f.status));
        }
        if (query.nationalities && query.nationalities.length > 0) {
            filtered = filtered.filter(f => query.nationalities.includes(f.personalInfo.nationality));
        }
        if (query.threatLevels && query.threatLevels.length > 0) {
            filtered = filtered.filter(f => query.threatLevels.includes(f.threatLevel));
        }
        if (query.conflictZones && query.conflictZones.length > 0) {
            filtered = filtered.filter(f => query.conflictZones.includes(f.combatExperience.conflictZone));
        }
        if (query.returnees) {
            filtered = filtered.filter(f => f.status === 'RETURNED');
        }
        const returneeProfiles = filtered
            .filter(f => f.status === 'RETURNED')
            .map(f => this.returnees.get(f.id))
            .filter(Boolean);
        return {
            fighters: filtered,
            totalCount: filtered.length,
            networks: Array.from(this.networks.values()),
            returnees: returneeProfiles,
            trends: this.calculateTrends(filtered)
        };
    }
    /**
     * Get fighter by ID
     */
    async getFighter(id) {
        return this.fighters.get(id);
    }
    /**
     * Get returnee profile
     */
    async getReturnee(fighterId) {
        return this.returnees.get(fighterId);
    }
    /**
     * Get fighter's network
     */
    async getFighterNetwork(fighterId) {
        return Array.from(this.networks.values()).filter(network => network.members.includes(fighterId));
    }
    /**
     * Assess returnee risk
     */
    async assessReturneeRisk(fighterId) {
        const returnee = this.returnees.get(fighterId);
        if (!returnee) {
            return 0;
        }
        return returnee.riskAssessment.overallRisk;
    }
    /**
     * Identify high-risk returnees
     */
    async identifyHighRiskReturnees() {
        return Array.from(this.returnees.values()).filter(returnee => returnee.riskAssessment.overallRisk >= 0.7);
    }
    /**
     * Track fighter flows
     */
    async analyzeFighterFlows() {
        const fighters = Array.from(this.fighters.values());
        return {
            outgoing: fighters.filter(f => f.status === 'TRAVELING').length,
            incoming: fighters.filter(f => f.status === 'RETURNED').length,
            inConflictZone: fighters.filter(f => f.status === 'IN_CONFLICT_ZONE').length
        };
    }
    /**
     * Get border alerts for fighter
     */
    async getFighterAlerts(fighterId) {
        return this.borderAlerts.filter(alert => alert.fighterId === fighterId);
    }
    /**
     * Private helper methods
     */
    calculateTrends(fighters) {
        const returnees = fighters.filter(f => f.status === 'RETURNED').length;
        const active = fighters.filter(f => f.status === 'IN_CONFLICT_ZONE').length;
        return [
            {
                type: 'Foreign Fighters',
                direction: 'STABLE',
                magnitude: fighters.length,
                period: '30-days',
                description: `${fighters.length} tracked fighters, ${returnees} returnees`
            }
        ];
    }
}
exports.FighterTracker = FighterTracker;
