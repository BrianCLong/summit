"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForeignPolicyAnalyzer = void 0;
const types_js_1 = require("./types.js");
/**
 * ForeignPolicyAnalyzer
 *
 * Comprehensive analysis of foreign policy positions, strategic doctrines,
 * policy evolution, and international alignments
 */
class ForeignPolicyAnalyzer {
    policies = new Map();
    policiesByCountry = new Map();
    policiesByDomain = new Map();
    doctrines = new Map();
    interests = new Map();
    /**
     * Track a foreign policy position
     */
    trackPolicy(policy) {
        this.policies.set(policy.id, policy);
        // Index by country
        if (!this.policiesByCountry.has(policy.country)) {
            this.policiesByCountry.set(policy.country, new Set());
        }
        this.policiesByCountry.get(policy.country).add(policy.id);
        // Index by domain
        if (!this.policiesByDomain.has(policy.domain)) {
            this.policiesByDomain.set(policy.domain, new Set());
        }
        this.policiesByDomain.get(policy.domain).add(policy.id);
    }
    /**
     * Track strategic doctrine
     */
    trackDoctrine(doctrine) {
        this.doctrines.set(`${doctrine.country}:${doctrine.name}`, doctrine);
    }
    /**
     * Track national interests
     */
    trackNationalInterest(interest) {
        if (!this.interests.has(interest.country)) {
            this.interests.set(interest.country, []);
        }
        this.interests.get(interest.country).push(interest);
    }
    /**
     * Get policies for a country
     */
    getPoliciesByCountry(country) {
        const policyIds = this.policiesByCountry.get(country) || new Set();
        return Array.from(policyIds)
            .map(id => this.policies.get(id))
            .filter((p) => p !== undefined);
    }
    /**
     * Get policies by domain
     */
    getPoliciesByDomain(domain) {
        const policyIds = this.policiesByDomain.get(domain) || new Set();
        return Array.from(policyIds)
            .map(id => this.policies.get(id))
            .filter((p) => p !== undefined);
    }
    /**
     * Detect policy shifts
     */
    detectPolicyShifts(country, days = 365) {
        const policies = this.getPoliciesByCountry(country);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const shifts = [];
        for (const policy of policies) {
            if (policy.shiftHistory) {
                const recentShifts = policy.shiftHistory.filter(s => s.date >= cutoffDate);
                shifts.push(...recentShifts);
            }
        }
        return shifts.sort((a, b) => b.date.getTime() - a.date.getTime());
    }
    /**
     * Analyze voting patterns
     */
    analyzeVotingPatterns(country) {
        const policies = this.getPoliciesByCountry(country);
        const allVotes = [];
        for (const policy of policies) {
            allVotes.push(...policy.votingRecords);
        }
        const voteDistribution = {
            YES: 0,
            NO: 0,
            ABSTAIN: 0,
            ABSENT: 0
        };
        const topics = new Set();
        for (const vote of allVotes) {
            voteDistribution[vote.vote]++;
            topics.add(vote.topic);
        }
        // Calculate alignment with majority (simplified)
        const alignmentWithMajority = allVotes.filter(v => v.vote === 'YES').length / allVotes.length * 100;
        return {
            totalVotes: allVotes.length,
            voteDistribution,
            topicsVotedOn: Array.from(topics),
            alignmentWithMajority,
            frequentCosponsors: []
        };
    }
    /**
     * Calculate policy alignment between two countries
     */
    calculatePolicyAlignment(country1, country2) {
        const policies1 = this.getPoliciesByCountry(country1);
        const policies2 = this.getPoliciesByCountry(country2);
        const domainAlignment = new Map();
        const similarities = [];
        const differences = [];
        for (const p1 of policies1) {
            const p2 = policies2.find(p => p.domain === p1.domain && p.topic === p1.topic);
            if (p2) {
                const alignment = this.calculatePositionAlignment(p1.position, p2.position);
                if (!domainAlignment.has(p1.domain)) {
                    domainAlignment.set(p1.domain, { alignment: 0, count: 0 });
                }
                const current = domainAlignment.get(p1.domain);
                current.alignment += alignment;
                current.count++;
                if (alignment > 80) {
                    similarities.push(`${p1.topic}: Both ${p1.position}`);
                }
                else if (alignment < 30) {
                    differences.push(`${p1.topic}: ${country1} ${p1.position} vs ${country2} ${p2.position}`);
                }
            }
        }
        const domainAlignmentArray = Array.from(domainAlignment.entries()).map(([domain, { alignment, count }]) => ({
            domain,
            alignment: alignment / count,
            trend: 'STABLE'
        }));
        const overallAlignment = domainAlignmentArray.length > 0
            ? domainAlignmentArray.reduce((sum, d) => sum + d.alignment, 0) / domainAlignmentArray.length
            : 0;
        let trajectory = 'STABLE';
        if (overallAlignment > 70)
            trajectory = 'IMPROVING';
        else if (overallAlignment < 40)
            trajectory = 'DETERIORATING';
        return {
            country1,
            country2,
            overallAlignment,
            domainAlignment: domainAlignmentArray,
            keySimilarities: similarities.slice(0, 10),
            keyDifferences: differences.slice(0, 10),
            trajectory,
            outlook: this.generateAlignmentOutlook(overallAlignment, trajectory)
        };
    }
    /**
     * Compare policies across multiple countries
     */
    comparePolicies(countries, domain, topic) {
        const positions = [];
        for (const country of countries) {
            const policies = this.getPoliciesByCountry(country);
            const policy = policies.find(p => p.domain === domain && p.topic === topic);
            if (policy) {
                positions.push({
                    country,
                    position: policy.position,
                    rationale: policy.officialStatement
                });
            }
        }
        // Categorize into spectrum
        const mostHawkish = positions
            .filter(p => p.position === types_js_1.PolicyPosition.STRONGLY_OPPOSE || p.position === types_js_1.PolicyPosition.OPPOSE)
            .map(p => p.country);
        const moderate = positions
            .filter(p => p.position === types_js_1.PolicyPosition.NEUTRAL || p.position === types_js_1.PolicyPosition.CONDITIONAL)
            .map(p => p.country);
        const mostDovish = positions
            .filter(p => p.position === types_js_1.PolicyPosition.STRONGLY_SUPPORT || p.position === types_js_1.PolicyPosition.SUPPORT)
            .map(p => p.country);
        // Detect coalitions
        const coalitions = this.detectCoalitions(positions);
        return {
            countries,
            domain,
            topic,
            positions,
            spectrum: {
                mostHawkish,
                moderate,
                mostDovish
            },
            coalitions,
            outliers: []
        };
    }
    /**
     * Analyze policy consistency over time
     */
    analyzePolicyConsistency(country, domain) {
        let policies = this.getPoliciesByCountry(country);
        if (domain) {
            policies = policies.filter(p => p.domain === domain);
        }
        const consistencyScores = policies.map(p => p.consistency);
        const overallConsistency = consistencyScores.length > 0
            ? consistencyScores.reduce((a, b) => a + b, 0) / consistencyScores.length
            : 0;
        const volatilePolicies = policies
            .filter(p => p.trendDirection === 'VOLATILE')
            .map(p => p.topic);
        const stablePolicies = policies
            .filter(p => p.trendDirection === 'STABLE' && p.consistency > 80)
            .map(p => p.topic);
        const majorReversals = [];
        for (const policy of policies) {
            if (policy.shiftHistory) {
                const reversals = policy.shiftHistory.filter(s => s.shiftType === 'MAJOR_REVERSAL' && s.magnitude >= 7);
                majorReversals.push(...reversals);
            }
        }
        return {
            overallConsistency,
            volatilePolicies,
            stablePolicies,
            majorReversals: majorReversals.sort((a, b) => b.date.getTime() - a.date.getTime())
        };
    }
    /**
     * Predict policy evolution
     */
    predictPolicyEvolution(country, domain) {
        const policies = this.getPoliciesByCountry(country).filter(p => p.domain === domain);
        if (policies.length === 0) {
            return {
                domain,
                currentTrend: 'UNKNOWN',
                predictedDirection: 'STABLE',
                confidence: 0,
                indicators: [],
                timeframe: 'N/A'
            };
        }
        // Analyze trends
        const hardening = policies.filter(p => p.trendDirection === 'HARDENING').length;
        const softening = policies.filter(p => p.trendDirection === 'SOFTENING').length;
        const stable = policies.filter(p => p.trendDirection === 'STABLE').length;
        let predictedDirection = 'STABLE';
        if (hardening > softening && hardening > stable)
            predictedDirection = 'HARDENING';
        else if (softening > hardening && softening > stable)
            predictedDirection = 'SOFTENING';
        const confidence = Math.max(hardening, softening, stable) / policies.length * 100;
        const indicators = this.identifyPolicyIndicators(policies, predictedDirection);
        return {
            domain,
            currentTrend: `${hardening} hardening, ${softening} softening, ${stable} stable`,
            predictedDirection,
            confidence,
            indicators,
            timeframe: '6-12 months'
        };
    }
    /**
     * Get national interests for a country
     */
    getNationalInterests(country, category) {
        const interests = this.interests.get(country) || [];
        if (category) {
            return interests.filter(i => i.category === category);
        }
        return interests;
    }
    /**
     * Analyze doctrine-policy alignment
     */
    analyzeDoctrineAlignment(country, doctrineName) {
        const doctrine = this.doctrines.get(`${country}:${doctrineName}`);
        if (!doctrine) {
            return {
                alignment: 0,
                consistentPolicies: [],
                inconsistentPolicies: [],
                recommendations: ['Doctrine not found']
            };
        }
        const policies = this.getPoliciesByCountry(country);
        const consistentPolicies = [];
        const inconsistentPolicies = [];
        for (const policy of policies) {
            // Simplified alignment check
            if (policy.consistency > 70) {
                consistentPolicies.push(policy.topic);
            }
            else {
                inconsistentPolicies.push(policy.topic);
            }
        }
        const alignment = policies.length > 0
            ? (consistentPolicies.length / policies.length) * 100
            : 0;
        const recommendations = [];
        if (alignment < 60) {
            recommendations.push('Consider revising doctrine to match actual policies');
            recommendations.push('Increase coordination between policy formulation and implementation');
        }
        return {
            alignment,
            consistentPolicies,
            inconsistentPolicies,
            recommendations
        };
    }
    calculatePositionAlignment(pos1, pos2) {
        if (pos1 === pos2)
            return 100;
        const positions = [
            types_js_1.PolicyPosition.STRONGLY_OPPOSE,
            types_js_1.PolicyPosition.OPPOSE,
            types_js_1.PolicyPosition.NEUTRAL,
            types_js_1.PolicyPosition.SUPPORT,
            types_js_1.PolicyPosition.STRONGLY_SUPPORT
        ];
        const idx1 = positions.indexOf(pos1);
        const idx2 = positions.indexOf(pos2);
        if (idx1 === -1 || idx2 === -1)
            return 50; // Unknown positions
        const distance = Math.abs(idx1 - idx2);
        return Math.max(0, 100 - (distance * 25));
    }
    generateAlignmentOutlook(alignment, trajectory) {
        if (alignment > 80) {
            return 'Strong strategic partnership with high policy coherence';
        }
        else if (alignment > 60) {
            return 'Significant alignment with areas of cooperation';
        }
        else if (alignment > 40) {
            return 'Mixed alignment with both cooperation and competition';
        }
        else {
            return 'Low alignment with significant policy divergence';
        }
    }
    detectCoalitions(positions) {
        const coalitions = new Map();
        for (const { country, position } of positions) {
            if (!coalitions.has(position)) {
                coalitions.set(position, []);
            }
            coalitions.get(position).push(country);
        }
        return Array.from(coalitions.entries())
            .filter(([_, members]) => members.length > 1)
            .map(([position, members]) => ({
            name: `${position} Coalition`,
            members,
            position: position.toString()
        }));
    }
    identifyPolicyIndicators(policies, direction) {
        const indicators = [];
        for (const policy of policies) {
            if (policy.trendDirection === direction) {
                if (policy.policyDocuments.length > 0) {
                    indicators.push(`Recent policy documents on ${policy.topic}`);
                }
                if (policy.speeches.length > 0) {
                    indicators.push(`Leadership speeches emphasizing ${policy.topic}`);
                }
            }
        }
        return indicators.slice(0, 5);
    }
    /**
     * Get statistics
     */
    getStatistics() {
        const policiesByDomain = {};
        for (const policy of this.policies.values()) {
            policiesByDomain[policy.domain] = (policiesByDomain[policy.domain] || 0) + 1;
        }
        return {
            totalPolicies: this.policies.size,
            policiesByDomain,
            countriesTracked: this.policiesByCountry.size,
            doctrinesTracked: this.doctrines.size
        };
    }
}
exports.ForeignPolicyAnalyzer = ForeignPolicyAnalyzer;
