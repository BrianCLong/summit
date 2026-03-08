"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WellbeingPredictor = void 0;
const crypto_1 = require("crypto");
const DEFAULT_WEIGHTS = {
    health: 0.20,
    economic: 0.18,
    educational: 0.12,
    social: 0.12,
    housing: 0.12,
    mental_health: 0.10,
    food_security: 0.08,
    employment: 0.08,
};
/**
 * AI-driven Wellbeing Predictor for citizen needs forecasting
 * Integrates health, economic, educational, and behavioral data
 */
class WellbeingPredictor {
    weights;
    modelVersion;
    constructor(weights = {}) {
        this.weights = { ...DEFAULT_WEIGHTS, ...weights };
        this.modelVersion = '1.0.0';
    }
    /**
     * Generate comprehensive wellbeing prediction for a citizen
     */
    predict(profile, options = {}) {
        const opts = {
            horizon: options.horizon ?? '90_days',
            includeContributingFactors: options.includeContributingFactors ?? true,
            minConfidence: options.minConfidence ?? 0.6,
        };
        const domainScores = this.calculateDomainScores(profile);
        const overallScore = this.calculateOverallScore(domainScores);
        const riskLevel = this.determineRiskLevel(overallScore);
        const trajectory = this.analyzeTrajectory(profile);
        const contributingFactors = opts.includeContributingFactors
            ? this.identifyContributingFactors(profile, domainScores)
            : [];
        const confidence = this.calculateConfidence(profile);
        return {
            citizenId: profile.citizenId,
            predictionId: (0, crypto_1.randomUUID)(),
            timestamp: new Date().toISOString(),
            overallWellbeingScore: Math.round(overallScore * 100) / 100,
            domainScores: domainScores,
            riskLevel,
            trajectoryTrend: trajectory,
            confidenceScore: confidence,
            predictionHorizon: opts.horizon,
            contributingFactors,
        };
    }
    /**
     * Batch prediction for multiple citizens
     */
    predictBatch(profiles, options = {}) {
        return profiles.map((profile) => this.predict(profile, options));
    }
    /**
     * Calculate domain-specific wellbeing scores
     */
    calculateDomainScores(profile) {
        return {
            health: this.scoreHealthDomain(profile.healthData),
            economic: this.scoreEconomicDomain(profile.economicData),
            educational: this.scoreEducationalDomain(profile.educationalData),
            social: this.scoreSocialDomain(profile.behavioralData),
            housing: this.scoreHousingDomain(profile.economicData),
            mental_health: this.scoreMentalHealthDomain(profile.healthData, profile.behavioralData),
            food_security: this.scoreFoodSecurityDomain(profile.economicData),
            employment: this.scoreEmploymentDomain(profile.economicData),
        };
    }
    scoreHealthDomain(data) {
        if (!data) {
            return 50;
        }
        let score = 70;
        // Chronic conditions impact
        score -= data.chronicConditions.length * 8;
        // Recent hospitalizations
        score -= data.recentHospitalizations * 12;
        // Healthcare access
        const accessScores = { none: -30, limited: -15, adequate: 0, full: 10 };
        score += accessScores[data.accessToHealthcare];
        // Mental health contribution
        if (data.mentalHealthScore !== undefined) {
            score += (data.mentalHealthScore - 50) * 0.3;
        }
        // Disability adjustment
        if (data.disabilityStatus) {
            score -= 10;
        }
        return Math.max(0, Math.min(100, score));
    }
    scoreEconomicDomain(data) {
        if (!data) {
            return 50;
        }
        let score = 60;
        // Income level
        const incomeScores = { poverty: -35, low: -15, middle: 10, high: 25 };
        score += incomeScores[data.incomeLevel];
        // Employment status
        const employmentScores = {
            employed: 15,
            unemployed: -25,
            underemployed: -10,
            retired: 5,
            student: 0,
            disabled: -5,
        };
        score += employmentScores[data.employmentStatus];
        // Debt ratio impact
        if (data.debtToIncomeRatio !== undefined) {
            if (data.debtToIncomeRatio > 0.5) {
                score -= 15;
            }
            else if (data.debtToIncomeRatio > 0.3) {
                score -= 8;
            }
        }
        return Math.max(0, Math.min(100, score));
    }
    scoreEducationalDomain(data) {
        if (!data) {
            return 50;
        }
        let score = 50;
        // Education level
        const eduScores = {
            none: -20,
            primary: -10,
            secondary: 5,
            vocational: 15,
            undergraduate: 20,
            graduate: 25,
            doctoral: 30,
        };
        score += eduScores[data.highestEducationLevel];
        // Literacy
        const literacyScores = { illiterate: -25, basic: -10, functional: 5, proficient: 15 };
        score += literacyScores[data.literacyLevel];
        // Digital literacy
        const digitalScores = { none: -15, basic: 0, intermediate: 8, advanced: 15 };
        score += digitalScores[data.digitalLiteracy];
        // Current enrollment bonus
        if (data.currentEnrollment) {
            score += 10;
        }
        return Math.max(0, Math.min(100, score));
    }
    scoreSocialDomain(data) {
        if (!data) {
            return 50;
        }
        let score = 50;
        // Community participation
        const participationScores = { isolated: -30, low: -10, moderate: 10, high: 25 };
        score += participationScores[data.communityParticipation];
        // Social support
        const supportScores = { none: -25, weak: -10, moderate: 10, strong: 20 };
        score += supportScores[data.socialSupportNetwork];
        // Service engagement
        score += (data.serviceEngagementScore - 50) * 0.2;
        return Math.max(0, Math.min(100, score));
    }
    scoreHousingDomain(data) {
        if (!data) {
            return 50;
        }
        const housingScores = { homeless: 0, unstable: 25, stable: 70, owned: 90 };
        return housingScores[data.housingStability];
    }
    scoreMentalHealthDomain(health, behavioral) {
        let score = 60;
        if (health?.mentalHealthScore !== undefined) {
            score = health.mentalHealthScore;
        }
        if (behavioral) {
            // Crisis history impact
            score -= behavioral.crisisHistoryCount * 8;
            // Social isolation impact
            if (behavioral.communityParticipation === 'isolated') {
                score -= 15;
            }
            if (behavioral.socialSupportNetwork === 'none') {
                score -= 15;
            }
        }
        return Math.max(0, Math.min(100, score));
    }
    scoreFoodSecurityDomain(data) {
        if (!data) {
            return 50;
        }
        const foodScores = { insecure: 15, marginal: 50, secure: 90 };
        return foodScores[data.foodSecurityStatus];
    }
    scoreEmploymentDomain(data) {
        if (!data) {
            return 50;
        }
        const employmentScores = {
            employed: 85,
            unemployed: 20,
            underemployed: 45,
            retired: 75,
            student: 60,
            disabled: 50,
        };
        return employmentScores[data.employmentStatus];
    }
    /**
     * Calculate weighted overall wellbeing score
     */
    calculateOverallScore(domainScores) {
        let totalWeight = 0;
        let weightedSum = 0;
        for (const [domain, score] of Object.entries(domainScores)) {
            const weight = this.weights[domain] ?? 0;
            weightedSum += score * weight;
            totalWeight += weight;
        }
        return totalWeight > 0 ? weightedSum / totalWeight : 50;
    }
    /**
     * Determine risk level from overall score
     */
    determineRiskLevel(score) {
        if (score < 25) {
            return 'critical';
        }
        if (score < 40) {
            return 'high';
        }
        if (score < 60) {
            return 'moderate';
        }
        if (score < 80) {
            return 'low';
        }
        return 'minimal';
    }
    /**
     * Analyze historical trajectory trend
     */
    analyzeTrajectory(profile) {
        const history = profile.historicalScores;
        if (history.length < 2) {
            return 'stable';
        }
        const recentScores = history.slice(-5);
        if (recentScores.length < 2) {
            return 'stable';
        }
        const firstHalf = recentScores.slice(0, Math.floor(recentScores.length / 2));
        const secondHalf = recentScores.slice(Math.floor(recentScores.length / 2));
        const avgFirst = firstHalf.reduce((sum, s) => sum + s.score, 0) / firstHalf.length;
        const avgSecond = secondHalf.reduce((sum, s) => sum + s.score, 0) / secondHalf.length;
        const diff = avgSecond - avgFirst;
        if (diff > 5) {
            return 'improving';
        }
        if (diff < -5) {
            return 'declining';
        }
        return 'stable';
    }
    /**
     * Identify key contributing factors to wellbeing
     */
    identifyContributingFactors(profile, domainScores) {
        const factors = [];
        // Health factors
        if (profile.healthData) {
            if (profile.healthData.chronicConditions.length > 0) {
                factors.push({
                    factor: 'Chronic health conditions',
                    impact: -0.15 * profile.healthData.chronicConditions.length,
                    domain: 'health',
                });
            }
            if (profile.healthData.accessToHealthcare === 'none') {
                factors.push({ factor: 'No healthcare access', impact: -0.3, domain: 'health' });
            }
        }
        // Economic factors
        if (profile.economicData) {
            if (profile.economicData.incomeLevel === 'poverty') {
                factors.push({ factor: 'Poverty-level income', impact: -0.35, domain: 'economic' });
            }
            if (profile.economicData.housingStability === 'homeless') {
                factors.push({ factor: 'Homelessness', impact: -0.5, domain: 'housing' });
            }
            if (profile.economicData.foodSecurityStatus === 'insecure') {
                factors.push({ factor: 'Food insecurity', impact: -0.3, domain: 'food_security' });
            }
            if (profile.economicData.employmentStatus === 'unemployed') {
                factors.push({ factor: 'Unemployment', impact: -0.25, domain: 'employment' });
            }
        }
        // Educational factors
        if (profile.educationalData) {
            if (profile.educationalData.literacyLevel === 'illiterate') {
                factors.push({ factor: 'Illiteracy', impact: -0.25, domain: 'educational' });
            }
            if (profile.educationalData.digitalLiteracy === 'none') {
                factors.push({ factor: 'No digital literacy', impact: -0.15, domain: 'educational' });
            }
        }
        // Behavioral/social factors
        if (profile.behavioralData) {
            if (profile.behavioralData.communityParticipation === 'isolated') {
                factors.push({ factor: 'Social isolation', impact: -0.3, domain: 'social' });
            }
            if (profile.behavioralData.crisisHistoryCount > 2) {
                factors.push({ factor: 'Crisis history', impact: -0.2, domain: 'mental_health' });
            }
        }
        return factors.sort((a, b) => a.impact - b.impact).slice(0, 10);
    }
    /**
     * Calculate prediction confidence based on data completeness
     */
    calculateConfidence(profile) {
        let completeness = 0;
        const total = 4;
        if (profile.healthData) {
            completeness++;
        }
        if (profile.economicData) {
            completeness++;
        }
        if (profile.educationalData) {
            completeness++;
        }
        if (profile.behavioralData) {
            completeness++;
        }
        const dataCompleteness = completeness / total;
        const historyBonus = Math.min(profile.historicalScores.length / 10, 0.2);
        return Math.min(0.95, dataCompleteness * 0.8 + historyBonus);
    }
    /**
     * Get model metadata
     */
    getModelInfo() {
        return {
            version: this.modelVersion,
            weights: { ...this.weights },
        };
    }
}
exports.WellbeingPredictor = WellbeingPredictor;
