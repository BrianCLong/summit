"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.foreignRelationsService = exports.ForeignRelationsService = void 0;
const foreign_policy_analysis_1 = require("@intelgraph/foreign-policy-analysis");
const bilateral_relations_1 = require("@intelgraph/bilateral-relations");
const economic_diplomacy_1 = require("@intelgraph/economic-diplomacy");
const predictive_diplomacy_1 = require("@intelgraph/predictive-diplomacy");
/**
 * ForeignRelationsService
 *
 * Core service for foreign policy analysis, bilateral relations monitoring,
 * economic diplomacy, and predictive analytics
 */
class ForeignRelationsService {
    policyAnalyzer;
    relationsMonitor;
    economicMonitor;
    predictor;
    constructor() {
        this.policyAnalyzer = new foreign_policy_analysis_1.ForeignPolicyAnalyzer();
        this.relationsMonitor = new bilateral_relations_1.BilateralRelationsMonitor();
        this.economicMonitor = new economic_diplomacy_1.EconomicDiplomacyMonitor();
        this.predictor = new predictive_diplomacy_1.PredictiveDiplomacy();
    }
    /**
     * Get comprehensive foreign relations overview for a country
     */
    getForeignRelationsOverview(country) {
        // Get policy positions
        const policyPositions = this.policyAnalyzer.getPoliciesByCountry(country);
        // Get bilateral relationships
        const bilateralRelationships = this.relationsMonitor.getCountryRelationships(country);
        // Get policy consistency
        const policyAlignment = this.policyAnalyzer.analyzePolicyConsistency(country);
        // Get economic partnerships
        const economicPartnerships = this.economicMonitor.getCountryPartnerships(country);
        // Get predicted policy shifts
        const predictedShifts = this.predictor.getPredictionsByType('POLICY_SHIFT');
        // Get risks
        const risks = this.predictor.assessRisks('SHORT_TERM');
        // Get opportunities
        const opportunities = this.predictor.identifyOpportunities('SHORT_TERM', 'DIPLOMACY');
        return {
            policyPositions,
            bilateralRelationships,
            policyAlignment,
            economicPartnerships,
            predictedShifts,
            risks,
            opportunities
        };
    }
    /**
     * Analyze bilateral relationship
     */
    analyzeBilateralRelationship(country1, country2) {
        const relationship = this.relationsMonitor.getRelationship(country1, country2);
        const health = this.relationsMonitor.assessRelationshipHealth(country1, country2);
        const policyAlignment = this.policyAnalyzer.calculatePolicyAlignment(country1, country2);
        const economicRelations = this.economicMonitor.analyzeBilateralEconomicRelations(country1, country2);
        // Generate trajectory prediction
        const currentQuality = relationship?.relationshipQuality || 50;
        const trend = relationship?.recentTrend || 'STABLE';
        const predictedTrajectory = this.predictor.predictRelationshipTrajectory(country1, country2, currentQuality, trend, []);
        const risks = this.relationsMonitor.detectRelationshipRisks(country1, country2);
        return {
            relationshipStatus: relationship,
            relationshipHealth: health,
            policyAlignment,
            economicRelations,
            predictedTrajectory,
            risks,
            recommendations: [
                ...health.recommendations,
                'Monitor economic indicators closely',
                'Track policy alignment trends'
            ]
        };
    }
    /**
     * Track foreign policy position
     */
    trackPolicy(policy) {
        this.policyAnalyzer.trackPolicy(policy);
    }
    /**
     * Track bilateral relationship
     */
    trackRelationship(relationship) {
        this.relationsMonitor.trackRelationship(relationship);
    }
    /**
     * Track economic partnership
     */
    trackEconomicPartnership(partnership) {
        this.economicMonitor.trackNegotiation(partnership);
    }
    /**
     * Generate policy shift predictions
     */
    predictPolicyShifts(country) {
        const policies = this.policyAnalyzer.getPoliciesByCountry(country);
        const predictions = [];
        for (const policy of policies) {
            if (policy.trendDirection === 'HARDENING' || policy.trendDirection === 'SOFTENING') {
                const prediction = this.predictor.predictPolicyShift(country, policy.domain, policy.position, []);
                predictions.push(prediction);
            }
        }
        return predictions;
    }
    /**
     * Analyze regional dynamics
     */
    analyzeRegionalDynamics(region, countries) {
        // Build relationship matrix
        const relationshipMatrix = [];
        for (const country1 of countries) {
            const row = [];
            for (const country2 of countries) {
                if (country1 === country2) {
                    row.push({ self: true });
                }
                else {
                    const rel = this.relationsMonitor.getRelationship(country1, country2);
                    row.push(rel || { quality: 0 });
                }
            }
            relationshipMatrix.push(row);
        }
        // Analyze cooperation patterns
        const cooperationPatterns = countries.map(c => this.relationsMonitor.analyzeCooperationPatterns(c));
        // Identify regional friction points
        const frictionPoints = [];
        for (const country of countries) {
            const relationships = this.relationsMonitor.getCountryRelationships(country);
            for (const rel of relationships) {
                if (rel.frictionPoints && rel.frictionPoints.length > 0) {
                    frictionPoints.push(...rel.frictionPoints);
                }
            }
        }
        // Assess regional stability
        const regionalStability = this.predictor.forecastRegionalStability(region, countries, 60, // baseline stability
        frictionPoints);
        // Calculate power balance
        const powerBalance = this.calculatePowerBalance(countries);
        // Generate predictions
        const predictions = this.predictor.generateForecast('REGIONAL', region, 'MEDIUM_TERM');
        return {
            relationshipMatrix,
            cooperationPatterns,
            frictionPoints,
            regionalStability,
            powerBalance,
            predictions
        };
    }
    /**
     * Compare foreign policies across countries
     */
    compareForeignPolicies(countries, domain, topic) {
        return this.policyAnalyzer.comparePolicies(countries, domain, topic);
    }
    /**
     * Identify crisis relationships
     */
    identifyCrisisRelationships() {
        return this.relationsMonitor.identifyCrisisRelationships();
    }
    /**
     * Identify improving relationships
     */
    identifyImprovingRelationships() {
        return this.relationsMonitor.identifyImprovingRelationships();
    }
    /**
     * Generate strategic forecast
     */
    generateStrategicForecast(scope, subject, timeframe) {
        return this.predictor.generateForecast(scope, subject, timeframe);
    }
    /**
     * Assess economic diplomacy effectiveness
     */
    assessEconomicDiplomacy(country) {
        const negotiations = this.economicMonitor.getCountryNegotiations(country);
        const partnerships = this.economicMonitor.getCountryPartnerships(country);
        const tradeAgreements = this.economicMonitor.getTradeAgreements(country);
        const effectiveness = this.economicMonitor.assessNegotiationEffectiveness(country);
        return {
            negotiations,
            partnerships,
            tradeAgreements,
            effectiveness,
            recommendations: [
                'Focus on high-value partnerships',
                'Accelerate stalled negotiations',
                'Leverage economic strengths in diplomacy'
            ]
        };
    }
    /**
     * Generate foreign policy intelligence report
     */
    generateForeignPolicyReport(country) {
        const overview = this.getForeignRelationsOverview(country);
        const policyConsistency = this.policyAnalyzer.analyzePolicyConsistency(country);
        const cooperationPatterns = this.relationsMonitor.analyzeCooperationPatterns(country);
        return {
            executiveSummary: `Foreign policy analysis for ${country}`,
            policyPositions: policyConsistency,
            keyRelationships: overview.bilateralRelationships.slice(0, 10),
            economicDiplomacy: this.assessEconomicDiplomacy(country),
            policyShifts: this.predictPolicyShifts(country),
            predictions: overview.predictedShifts,
            risks: overview.risks,
            opportunities: overview.opportunities,
            strategicRecommendations: [
                'Maintain policy consistency in key domains',
                'Strengthen strategic partnerships',
                'Address relationship risks proactively',
                'Capitalize on emerging opportunities',
                'Monitor regional dynamics closely'
            ]
        };
    }
    /**
     * Track and verify predictions
     */
    verifyPrediction(predictionId, actualOutcome) {
        return this.predictor.verifyPrediction(predictionId, actualOutcome);
    }
    /**
     * Get service statistics
     */
    getStatistics() {
        return {
            policies: this.policyAnalyzer.getStatistics(),
            relationships: this.relationsMonitor.getStatistics(),
            economicDiplomacy: this.economicMonitor.getStatistics(),
            predictions: this.predictor.getStatistics()
        };
    }
    /**
     * Calculate power balance in region
     */
    calculatePowerBalance(countries) {
        // Simplified power calculation based on relationships
        const influence = countries.map(country => {
            const relationships = this.relationsMonitor.getCountryRelationships(country);
            const avgQuality = relationships.length > 0
                ? relationships.reduce((sum, r) => sum + r.relationshipQuality, 0) / relationships.length
                : 50;
            return {
                country,
                influence: avgQuality
            };
        });
        const sorted = influence.sort((a, b) => b.influence - a.influence);
        const topInfluence = sorted[0]?.influence || 0;
        const powerCenters = sorted.filter(c => c.influence > topInfluence * 0.8).map(c => c.country);
        let balanceType;
        if (powerCenters.length === 1)
            balanceType = 'UNIPOLAR';
        else if (powerCenters.length === 2)
            balanceType = 'BIPOLAR';
        else
            balanceType = 'MULTIPOLAR';
        return {
            countries: influence,
            powerCenters,
            balanceType
        };
    }
}
exports.ForeignRelationsService = ForeignRelationsService;
/**
 * Singleton instance
 */
exports.foreignRelationsService = new ForeignRelationsService();
