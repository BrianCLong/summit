"use strict";
/**
 * Counterterrorism Service
 * Core service for counterterrorism operations and intelligence
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CounterterrorismService = void 0;
const terrorist_tracking_1 = require("@intelgraph/terrorist-tracking");
const extremism_monitor_1 = require("@intelgraph/extremism-monitor");
const radicalization_detection_1 = require("@intelgraph/radicalization-detection");
const foreign_fighters_1 = require("@intelgraph/foreign-fighters");
const terrorist_finance_1 = require("@intelgraph/terrorist-finance");
const propaganda_analysis_1 = require("@intelgraph/propaganda-analysis");
class CounterterrorismService {
    orgTracker;
    attackDetector;
    radicalizationMonitor;
    fighterTracker;
    financeTracker;
    propagandaAnalyzer;
    operations = new Map();
    opportunities = new Map();
    evidence = new Map();
    sharing = [];
    compliance = new Map();
    constructor() {
        this.orgTracker = new terrorist_tracking_1.OrganizationTracker();
        this.attackDetector = new extremism_monitor_1.AttackDetector();
        this.radicalizationMonitor = new radicalization_detection_1.RadicalizationMonitor();
        this.fighterTracker = new foreign_fighters_1.FighterTracker();
        this.financeTracker = new terrorist_finance_1.FinanceTracker();
        this.propagandaAnalyzer = new propaganda_analysis_1.PropagandaAnalyzer();
    }
    /**
     * Get all component services
     */
    getServices() {
        return {
            organizations: this.orgTracker,
            attacks: this.attackDetector,
            radicalization: this.radicalizationMonitor,
            fighters: this.fighterTracker,
            finance: this.financeTracker,
            propaganda: this.propagandaAnalyzer
        };
    }
    /**
     * Create operation
     */
    async createOperation(operation) {
        // Ensure legal compliance
        if (!this.compliance.has(operation.id)) {
            throw new Error('Legal compliance assessment required');
        }
        this.operations.set(operation.id, operation);
    }
    /**
     * Identify interdiction opportunities
     */
    async identifyInterdictionOpportunities() {
        const opportunities = [];
        // Check for imminent attacks
        const attacks = await this.attackDetector.queryAttackPlans({
            status: ['IMMINENT', 'PREPARATION']
        });
        for (const attack of attacks.criticalThreats) {
            opportunities.push({
                id: `interdiction-${attack.id}`,
                targetId: attack.id,
                targetType: 'OPERATION',
                opportunity: 'Imminent attack can be interdicted',
                timeWindow: {
                    start: new Date(),
                    end: attack.timeline?.expectedExecution || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                },
                probability: attack.confidence,
                impact: 1.0,
                recommendation: 'Immediate intervention recommended',
                requirements: ['Surveillance', 'Law enforcement coordination', 'Legal authorization']
            });
        }
        // Check for high-risk returnees
        const returnees = await this.fighterTracker.identifyHighRiskReturnees();
        for (const returnee of returnees) {
            opportunities.push({
                id: `interdiction-returnee-${returnee.fighterId}`,
                targetId: returnee.fighterId,
                targetType: 'INDIVIDUAL',
                opportunity: 'High-risk returnee requires monitoring/intervention',
                timeWindow: {
                    start: new Date(),
                    end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                },
                probability: returnee.riskAssessment.overallRisk,
                impact: 0.8,
                recommendation: 'Enhanced monitoring and deradicalization program',
                requirements: ['Surveillance', 'Community engagement', 'Deradicalization resources']
            });
        }
        return opportunities;
    }
    /**
     * Identify disruption targets
     */
    async identifyDisruptionTargets() {
        const targets = [];
        // Financial disruption opportunities
        const financeQuery = await this.financeTracker.query({
            sanctioned: false
        });
        for (const entity of financeQuery.entities) {
            if (entity.riskScore >= 0.7) {
                targets.push({
                    id: `disruption-finance-${entity.id}`,
                    type: 'FINANCIAL_NETWORK',
                    priority: 'HIGH',
                    vulnerabilities: [
                        {
                            type: 'Financial',
                            description: 'High-value financial node',
                            severity: 'HIGH',
                            exploitable: true
                        }
                    ],
                    disruptionMethods: [
                        {
                            method: 'Asset Freeze',
                            description: 'Freeze assets and accounts',
                            feasibility: 'HIGH',
                            impact: 'HIGH',
                            legalCompliance: true
                        },
                        {
                            method: 'Sanctions',
                            description: 'Apply targeted sanctions',
                            feasibility: 'HIGH',
                            impact: 'HIGH',
                            legalCompliance: true
                        }
                    ],
                    expectedImpact: 'Significant disruption to financing operations',
                    risks: ['Adaptation to alternative methods', 'Legal challenges']
                });
            }
        }
        return targets;
    }
    /**
     * Collect and manage evidence
     */
    async collectEvidence(evidence) {
        this.evidence.set(evidence.id, evidence);
    }
    /**
     * Share information with partner agencies
     */
    async shareInformation(sharing) {
        this.sharing.push(sharing);
    }
    /**
     * Ensure legal compliance
     */
    async ensureLegalCompliance(compliance) {
        if (!compliance.humanRights.compliance) {
            throw new Error('Human rights compliance violation detected');
        }
        this.compliance.set(compliance.operationId, compliance);
    }
    /**
     * Assess operation effectiveness
     */
    async assessEffectiveness(operationId) {
        const operation = this.operations.get(operationId);
        if (!operation) {
            throw new Error('Operation not found');
        }
        const metrics = {
            operationId,
            metrics: [],
            overallEffectiveness: 0,
            assessmentDate: new Date()
        };
        // Calculate metrics based on outcomes
        let totalEffectiveness = 0;
        let count = 0;
        for (const outcome of operation.outcomes) {
            if (outcome.success) {
                totalEffectiveness += 1;
            }
            count++;
        }
        metrics.overallEffectiveness = count > 0 ? totalEffectiveness / count : 0;
        metrics.metrics.push({
            name: 'Success Rate',
            value: metrics.overallEffectiveness,
            target: 0.8,
            unit: 'percentage'
        });
        return metrics;
    }
    /**
     * Get comprehensive threat picture
     */
    async getThreatPicture() {
        const [organizations, attacks, radicalization, fighters, finance, propaganda] = await Promise.all([
            this.orgTracker.queryOrganizations({}),
            this.attackDetector.queryAttackPlans({}),
            this.radicalizationMonitor.queryProfiles({}),
            this.fighterTracker.queryFighters({}),
            this.financeTracker.query({}),
            this.propagandaAnalyzer.query({})
        ]);
        return {
            organizations: {
                total: organizations.totalCount,
                active: organizations.organizations.filter(o => o.status === 'ACTIVE').length,
                threats: organizations.threats
            },
            attacks: {
                total: attacks.totalCount,
                critical: attacks.criticalThreats.length,
                indicators: attacks.indicators.length
            },
            radicalization: {
                total: radicalization.totalCount,
                highRisk: radicalization.highRisk.length
            },
            fighters: {
                total: fighters.totalCount,
                returnees: fighters.returnees.length
            },
            finance: {
                totalFlow: finance.totalFlow,
                networks: finance.networks.length
            },
            propaganda: {
                total: propaganda.totalCount,
                campaigns: propaganda.campaigns.length
            }
        };
    }
}
exports.CounterterrorismService = CounterterrorismService;
