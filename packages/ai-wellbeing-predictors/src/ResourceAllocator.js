"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceAllocator = void 0;
const crypto_1 = require("crypto");
const DEFAULT_CONFIG = {
    minAllocationPercent: 0.05,
    maxAllocationPercent: 0.35,
    reservePercent: 0.10,
};
/**
 * Domain-specific cost per citizen served (in currency units).
 * These are average costs based on typical intervention programs.
 * NOTE: In production, these would be configurable per-region and updated periodically.
 */
const DOMAIN_COST_PER_CITIZEN = {
    health: 2500, // Healthcare interventions are expensive
    economic: 1200, // Financial counseling, benefits enrollment
    educational: 800, // Training programs, tutoring
    social: 400, // Community programs, group activities
    housing: 5000, // Housing assistance is most expensive
    mental_health: 1800, // Therapy, counseling services
    food_security: 600, // Food assistance programs
    employment: 1000, // Job training, placement services
};
/**
 * Base improvement rate per domain (percentage points per $1000 allocated per citizen).
 * Higher values mean more cost-effective interventions.
 */
const DOMAIN_IMPROVEMENT_RATE = {
    health: 2.0,
    economic: 3.5,
    educational: 4.0,
    social: 5.0,
    housing: 2.5,
    mental_health: 3.0,
    food_security: 6.0,
    employment: 3.5,
};
/**
 * AI-driven resource allocation optimizer for citizen wellbeing programs.
 *
 * This allocator implements a severity-weighted budget distribution algorithm that:
 * - Analyzes domain-level wellbeing scores across a population
 * - Calculates severity scores based on average scores and at-risk counts
 * - Applies min/max constraints with proper rebalancing to ensure budget integrity
 * - Projects impact using domain-specific cost and improvement models
 *
 * ## Important Limitations (In-Memory Simulation)
 *
 * This implementation is a **simulation model** suitable for:
 * - Demonstrating allocation logic and algorithms
 * - Testing business rules and edge cases
 * - Prototyping resource distribution strategies
 *
 * For **production deployment**, the following would be required:
 * - Persistent storage for allocation decisions and historical outcomes
 * - Real-time budget tracking and reconciliation
 * - Integration with actual program enrollment systems
 * - Historical outcome data to calibrate improvement projections
 * - Audit trail for allocation decisions
 * - Multi-region conflict resolution
 *
 * ## Cost Model Notes
 *
 * Domain costs (DOMAIN_COST_PER_CITIZEN) and improvement rates (DOMAIN_IMPROVEMENT_RATE)
 * are illustrative defaults. Production implementations should:
 * - Source costs from actual program data
 * - Apply regional cost-of-living adjustments
 * - Update rates based on measured outcomes
 */
class ResourceAllocator {
    config;
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    /**
     * Generate optimal resource allocation for a region.
     *
     * NOTE: This is an in-memory simulation. In production, allocation decisions
     * would be persisted to a database and tracked over time. The projections
     * are estimates based on domain-specific cost models and historical averages.
     *
     * @throws {Error} If totalBudget is negative or predictions array is empty
     */
    allocate(predictions, totalBudget, region) {
        // Input validation
        if (totalBudget < 0) {
            throw new Error('Total budget cannot be negative');
        }
        if (!predictions || predictions.length === 0) {
            throw new Error('Predictions array cannot be empty');
        }
        if (!region || region.trim() === '') {
            throw new Error('Region must be specified');
        }
        const availableBudget = totalBudget * (1 - this.config.reservePercent);
        const domainNeeds = this.calculateDomainNeeds(predictions);
        const allocations = this.optimizeAllocation(domainNeeds, availableBudget, predictions.length);
        const populationAtRisk = predictions.filter((p) => p.riskLevel === 'critical' || p.riskLevel === 'high').length;
        return {
            allocationId: (0, crypto_1.randomUUID)(),
            region,
            timestamp: new Date().toISOString(),
            totalBudget,
            allocations,
            populationAtRisk,
            projectedImpact: {
                citizensServed: this.estimateCitizensServed(predictions, allocations),
                wellbeingImprovement: this.estimateWellbeingImprovement(predictions, allocations),
            },
        };
    }
    /**
     * Analyze a cohort of citizens.
     *
     * @throws {Error} If predictions array is empty
     */
    analyzeCohort(predictions, criteria) {
        if (!predictions || predictions.length === 0) {
            throw new Error('Predictions array cannot be empty for cohort analysis');
        }
        const avgScore = predictions.reduce((sum, p) => sum + p.overallWellbeingScore, 0) /
            predictions.length;
        const riskDistribution = this.calculateRiskDistribution(predictions);
        const topRiskFactors = this.aggregateRiskFactors(predictions);
        const interventions = this.identifyTopInterventions(predictions);
        return {
            cohortId: (0, crypto_1.randomUUID)(),
            criteria,
            populationSize: predictions.length,
            averageWellbeingScore: Math.round(avgScore * 100) / 100,
            riskDistribution,
            topRiskFactors,
            recommendedInterventions: interventions,
            projectedOutcomes: {
                withIntervention: Math.min(100, avgScore + 15),
                withoutIntervention: Math.max(0, avgScore - 5),
            },
        };
    }
    /**
     * Compare allocation scenarios
     */
    compareScenarios(predictions, budgets, region) {
        return budgets.map((budget) => this.allocate(predictions, budget, region));
    }
    calculateDomainNeeds(predictions) {
        const needs = new Map();
        for (const prediction of predictions) {
            for (const [domain, score] of Object.entries(prediction.domainScores)) {
                const d = domain;
                const current = needs.get(d) || { totalScore: 0, count: 0, atRisk: 0 };
                current.totalScore += score;
                current.count++;
                if (score < 50) {
                    current.atRisk++;
                }
                needs.set(d, current);
            }
        }
        const result = new Map();
        for (const [domain, stats] of needs) {
            const avgScore = stats.totalScore / stats.count;
            result.set(domain, {
                avgScore,
                atRiskCount: stats.atRisk,
                severity: (100 - avgScore) * (stats.atRisk / stats.count),
            });
        }
        return result;
    }
    /**
     * Optimize allocation across domains ensuring budget balance.
     *
     * The algorithm:
     * 1. Calculate raw allocation percentages based on severity
     * 2. Apply min/max constraints
     * 3. CRITICAL: Rebalance to ensure allocations sum to available budget
     * 4. Distribute any remainder proportionally
     */
    optimizeAllocation(needs, budget, totalPopulation) {
        if (budget === 0 || needs.size === 0) {
            return [];
        }
        const totalSeverity = Array.from(needs.values()).reduce((sum, n) => sum + n.severity, 0);
        // Phase 1: Calculate clamped percentages
        const clampedPercentages = new Map();
        let totalClampedPercent = 0;
        for (const [domain, stats] of needs) {
            // If all domains have zero severity, distribute equally
            const rawPercent = totalSeverity > 0 ? stats.severity / totalSeverity : 1 / needs.size;
            const clampedPercent = Math.max(this.config.minAllocationPercent, Math.min(this.config.maxAllocationPercent, rawPercent));
            clampedPercentages.set(domain, { percent: clampedPercent, stats });
            totalClampedPercent += clampedPercent;
        }
        // Phase 2: Normalize to ensure percentages sum to 1.0 (or as close as constraints allow)
        // This is the critical fix - without normalization, budget doesn't balance
        const allocations = [];
        let allocatedTotal = 0;
        for (const [domain, { percent, stats }] of clampedPercentages) {
            // Normalize the clamped percentage to sum to 1.0
            const normalizedPercent = totalClampedPercent > 0 ? percent / totalClampedPercent : 0;
            const amount = Math.floor(budget * normalizedPercent);
            allocatedTotal += amount;
            allocations.push({
                domain,
                amount,
                rationale: this.generateAllocationRationale(domain, stats, normalizedPercent),
                expectedOutcomes: this.generateExpectedOutcomes(domain, stats.atRiskCount, amount),
            });
        }
        // Phase 3: Distribute rounding remainder to highest-severity domains
        const remainder = Math.round(budget - allocatedTotal);
        if (remainder > 0 && allocations.length > 0) {
            // Sort by severity (via amount) and add remainder to top domains
            allocations.sort((a, b) => b.amount - a.amount);
            for (let i = 0; i < remainder && i < allocations.length; i++) {
                allocations[i].amount += 1;
            }
        }
        return allocations.sort((a, b) => b.amount - a.amount);
    }
    generateAllocationRationale(domain, stats, percent) {
        return `${Math.round(percent * 100)}% allocation for ${domain.replace('_', ' ')} ` +
            `based on avg score of ${Math.round(stats.avgScore)}% and ${stats.atRiskCount} citizens at risk.`;
    }
    /**
     * Generate expected outcomes based on actual allocation amount and domain costs.
     * The number of citizens served is calculated from allocation / domain cost.
     */
    generateExpectedOutcomes(domain, atRiskCount, allocationAmount) {
        const outcomes = {
            health: ['Improved healthcare access', 'Reduced emergency visits', 'Better chronic disease management'],
            economic: ['Increased financial stability', 'Reduced debt burden', 'Improved credit scores'],
            educational: ['Higher literacy rates', 'Increased job readiness', 'Digital skills improvement'],
            social: ['Reduced isolation', 'Stronger community ties', 'Improved support networks'],
            housing: ['Stable housing placements', 'Reduced homelessness', 'Better living conditions'],
            mental_health: ['Reduced crisis incidents', 'Improved mental health scores', 'Better coping skills'],
            food_security: ['Reduced food insecurity', 'Improved nutrition', 'Stable food access'],
            employment: ['Reduced unemployment', 'Higher job retention', 'Increased income levels'],
        };
        // Calculate citizens that can be served based on domain-specific cost
        const costPerCitizen = DOMAIN_COST_PER_CITIZEN[domain];
        const citizensServable = Math.floor(allocationAmount / costPerCitizen);
        // Cap at actual at-risk count - can't serve more than need help
        const citizensServed = Math.min(citizensServable, atRiskCount);
        return outcomes[domain].slice(0, 2).map((o) => `${o} for ~${citizensServed} citizens`);
    }
    /**
     * Estimate total citizens served using domain-specific cost models.
     * Each domain has different costs per citizen served, so we calculate
     * per-domain capacity and aggregate.
     */
    estimateCitizensServed(predictions, allocations) {
        if (allocations.length === 0) {
            return 0;
        }
        // Calculate citizens served per domain based on domain-specific costs
        let totalCitizensServed = 0;
        const citizenCountByDomain = this.calculateDomainNeeds(predictions);
        for (const allocation of allocations) {
            const domainCost = DOMAIN_COST_PER_CITIZEN[allocation.domain];
            const domainNeeds = citizenCountByDomain.get(allocation.domain);
            const atRiskInDomain = domainNeeds?.atRiskCount ?? 0;
            // Citizens servable = allocation / cost, but capped at at-risk count
            const citizensServable = Math.floor(allocation.amount / domainCost);
            const citizensServed = Math.min(citizensServable, atRiskInDomain);
            totalCitizensServed += citizensServed;
        }
        // A citizen may have multiple domain needs - deduplicate by capping at total population
        // In reality, this is a simplification; true deduplication would require tracking individuals
        const atRiskPopulation = predictions.filter((p) => p.riskLevel === 'critical' || p.riskLevel === 'high' || p.riskLevel === 'moderate').length;
        return Math.min(totalCitizensServed, atRiskPopulation);
    }
    /**
     * Estimate wellbeing improvement based on actual allocation amounts.
     *
     * The improvement model considers:
     * - Current average wellbeing score (baseline)
     * - Allocation amounts per domain
     * - Domain-specific improvement rates
     * - Diminishing returns at higher allocations
     *
     * NOTE: This is a simplified model. Production implementations would use
     * historical outcome data to calibrate improvement projections.
     */
    estimateWellbeingImprovement(predictions, allocations) {
        if (predictions.length === 0 || allocations.length === 0) {
            return 0;
        }
        const currentAvg = predictions.reduce((sum, p) => sum + p.overallWellbeingScore, 0) / predictions.length;
        const citizenCountByDomain = this.calculateDomainNeeds(predictions);
        // Calculate weighted improvement across all domains
        let totalWeightedImprovement = 0;
        let totalWeight = 0;
        for (const allocation of allocations) {
            const domainNeeds = citizenCountByDomain.get(allocation.domain);
            if (!domainNeeds || domainNeeds.atRiskCount === 0)
                continue;
            const domainCost = DOMAIN_COST_PER_CITIZEN[allocation.domain];
            const improvementRate = DOMAIN_IMPROVEMENT_RATE[allocation.domain];
            // Calculate coverage: what % of at-risk citizens can be served
            const citizensServable = Math.floor(allocation.amount / domainCost);
            const coverage = Math.min(1, citizensServable / domainNeeds.atRiskCount);
            // Calculate improvement potential: how much can this domain improve
            // Domains with lower scores have more room to improve
            const roomToImprove = 100 - domainNeeds.avgScore;
            const improvementPotential = roomToImprove * (improvementRate / 10);
            // Apply diminishing returns using logarithmic scaling
            // Higher allocations have less marginal impact
            const allocationEfficiency = Math.log10(1 + allocation.amount / 10000) / 2;
            // Weight by coverage and at-risk count
            const domainImprovement = improvementPotential * coverage * allocationEfficiency;
            const weight = domainNeeds.atRiskCount;
            totalWeightedImprovement += domainImprovement * weight;
            totalWeight += weight;
        }
        if (totalWeight === 0) {
            return currentAvg;
        }
        const avgImprovement = totalWeightedImprovement / totalWeight;
        const projectedScore = Math.min(100, currentAvg + avgImprovement);
        return Math.round(projectedScore * 100) / 100;
    }
    calculateRiskDistribution(predictions) {
        const distribution = {
            critical: 0,
            high: 0,
            moderate: 0,
            low: 0,
            minimal: 0,
        };
        for (const p of predictions) {
            distribution[p.riskLevel]++;
        }
        return distribution;
    }
    aggregateRiskFactors(predictions) {
        const factorMap = new Map();
        for (const prediction of predictions) {
            for (const factor of prediction.contributingFactors) {
                const current = factorMap.get(factor.factor) || { count: 0, totalImpact: 0 };
                current.count++;
                current.totalImpact += Math.abs(factor.impact);
                factorMap.set(factor.factor, current);
            }
        }
        return Array.from(factorMap.entries())
            .map(([factor, stats]) => ({
            factor,
            prevalence: stats.count / predictions.length,
            averageImpact: stats.totalImpact / stats.count,
        }))
            .sort((a, b) => b.prevalence * b.averageImpact - a.prevalence * a.averageImpact)
            .slice(0, 10);
    }
    identifyTopInterventions(predictions) {
        const domainCounts = new Map();
        for (const prediction of predictions) {
            for (const [domain, score] of Object.entries(prediction.domainScores)) {
                if (score < 50) {
                    domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
                }
            }
        }
        const interventionMap = {
            housing: 'Housing Stability Programs',
            food_security: 'Food Assistance & Nutrition',
            employment: 'Job Training & Placement',
            mental_health: 'Mental Health Services',
            health: 'Healthcare Access Programs',
            social: 'Community Connection Initiatives',
            educational: 'Education & Skills Development',
            economic: 'Financial Stability Support',
        };
        return Array.from(domainCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([domain]) => interventionMap[domain]);
    }
}
exports.ResourceAllocator = ResourceAllocator;
