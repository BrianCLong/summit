"use strict";
/**
 * Summit Work Graph - AI-Powered Auto-Triage
 *
 * Intelligent ticket classification and routing:
 * - Automatic priority assessment
 * - Area and type classification
 * - Agent eligibility determination
 * - Similar ticket detection
 * - Effort estimation
 * - Risk scoring
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoTriageEngine = void 0;
// ============================================
// Default Configuration
// ============================================
const DEFAULT_CONFIG = {
    priorityKeywords: {
        P0: ['outage', 'down', 'critical', 'security breach', 'data loss', 'production crash', 'emergency'],
        P1: ['urgent', 'blocker', 'security', 'performance degradation', 'customer escalation', 'sla breach'],
        P2: ['bug', 'regression', 'important', 'customer request', 'compliance'],
        P3: ['enhancement', 'nice to have', 'technical debt', 'refactor', 'documentation'],
    },
    areaPatterns: [
        {
            area: 'frontend',
            keywords: ['ui', 'ux', 'react', 'css', 'component', 'page', 'button', 'form', 'modal', 'dashboard'],
            filePatterns: ['*.tsx', '*.jsx', '*.css', '*.scss', 'components/*', 'pages/*'],
        },
        {
            area: 'backend',
            keywords: ['api', 'endpoint', 'service', 'database', 'query', 'server', 'rest', 'graphql'],
            filePatterns: ['*.ts', 'services/*', 'api/*', 'routes/*'],
        },
        {
            area: 'data',
            keywords: ['data', 'analytics', 'pipeline', 'etl', 'warehouse', 'metrics', 'reporting'],
            filePatterns: ['*.sql', 'data/*', 'analytics/*'],
        },
        {
            area: 'infra',
            keywords: ['infrastructure', 'deploy', 'kubernetes', 'docker', 'ci/cd', 'terraform', 'helm'],
            filePatterns: ['*.yaml', '*.yml', 'infra/*', 'helm/*', 'terraform/*'],
        },
        {
            area: 'security',
            keywords: ['security', 'auth', 'authentication', 'authorization', 'vulnerability', 'cve', 'encryption'],
            filePatterns: ['security/*', 'auth/*'],
        },
        {
            area: 'ai',
            keywords: ['ai', 'ml', 'model', 'llm', 'embedding', 'inference', 'training', 'agent'],
            filePatterns: ['ai/*', 'models/*', 'ml/*'],
        },
    ],
    agentEligibilityCriteria: {
        maxComplexityScore: 7,
        requiredKeywords: ['clear', 'straightforward', 'simple', 'add', 'update', 'fix', 'test'],
        excludedKeywords: ['design decision', 'architecture', 'customer meeting', 'stakeholder', 'review with'],
        requiredPatterns: ['acceptance criteria', 'expected behavior', 'test case'],
    },
    effortEstimationRules: [
        { condition: 'small fix', baseHours: 2, multiplier: 1 },
        { condition: 'bug fix', baseHours: 4, multiplier: 1 },
        { condition: 'feature', baseHours: 8, multiplier: 1.2 },
        { condition: 'refactor', baseHours: 6, multiplier: 1.1 },
        { condition: 'migration', baseHours: 16, multiplier: 1.5 },
        { condition: 'security', baseHours: 8, multiplier: 1.3 },
    ],
    riskFactorPatterns: [
        { pattern: 'database migration', riskLevel: 30, description: 'Involves database changes' },
        { pattern: 'breaking change', riskLevel: 25, description: 'May break existing functionality' },
        { pattern: 'third party', riskLevel: 20, description: 'Depends on external service' },
        { pattern: 'no tests', riskLevel: 15, description: 'Missing test coverage' },
        { pattern: 'legacy', riskLevel: 15, description: 'Involves legacy code' },
        { pattern: 'customer facing', riskLevel: 10, description: 'Affects customer experience' },
    ],
};
// ============================================
// Auto-Triage Engine
// ============================================
class AutoTriageEngine {
    config;
    graphStore;
    constructor(graphStore, config) {
        this.graphStore = graphStore;
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    /**
     * Triage a new ticket
     */
    async triage(input) {
        const text = `${input.title} ${input.description}`.toLowerCase();
        const ticketType = this.classifyType(text, input);
        const priority = this.assessPriority(text, input);
        const area = this.classifyArea(text, input);
        const { eligible: agentEligible, reason: agentReason } = this.assessAgentEligibility(text, input);
        const estimate = this.estimateEffort(text, ticketType, area);
        const { score: riskScore, factors: riskFactors } = this.assessRisk(text);
        const similarTickets = await this.findSimilarTickets(input.title, input.description);
        const suggestions = this.generateSuggestions(ticketType, priority, area, similarTickets);
        const confidence = this.calculateConfidence(text, ticketType, priority, area);
        return {
            ticketType,
            priority,
            area,
            agentEligible,
            estimate,
            confidence,
            reasoning: {
                typeReason: this.explainTypeClassification(text, ticketType),
                priorityReason: this.explainPriorityAssessment(text, priority),
                areaReason: this.explainAreaClassification(text, area),
                agentReason,
                estimateReason: this.explainEstimate(ticketType, area, estimate),
            },
            suggestions,
            similarTickets,
            riskScore,
            riskFactors,
        };
    }
    /**
     * Batch triage multiple tickets
     */
    async batchTriage(inputs) {
        const results = new Map();
        await Promise.all(inputs.map(async (input, index) => {
            const result = await this.triage(input);
            results.set(index, result);
        }));
        return results;
    }
    /**
     * Re-triage existing tickets that have changed
     */
    async retriageTicket(ticket) {
        return this.triage({
            title: ticket.title,
            description: ticket.description,
            labels: [],
        });
    }
    // ============================================
    // Classification Methods
    // ============================================
    classifyType(text, input) {
        const typeIndicators = {
            bug: ['bug', 'error', 'crash', 'broken', 'fix', 'issue', 'not working', 'fails', 'security', 'vulnerability', 'cve', 'incident', 'outage'],
            feature: ['feature', 'new', 'add', 'implement', 'create', 'build', 'enhance'],
            refactor: ['refactor', 'cleanup', 'debt', 'improve', 'optimize', 'deprecate'],
            chore: ['chore', 'maintenance', 'update', 'upgrade', 'dependency'],
            docs: ['docs', 'documentation', 'readme', 'guide', 'tutorial', 'api docs'],
            test: ['test', 'coverage', 'unit test', 'e2e', 'integration test'],
            unknown: [],
        };
        let bestType = 'feature';
        let bestScore = 0;
        for (const [type, keywords] of Object.entries(typeIndicators)) {
            const score = keywords.filter((k) => text.includes(k)).length;
            if (score > bestScore) {
                bestScore = score;
                bestType = type;
            }
        }
        return bestType;
    }
    assessPriority(text, input) {
        for (const [priority, keywords] of Object.entries(this.config.priorityKeywords)) {
            if (keywords.some((k) => text.includes(k.toLowerCase()))) {
                return priority;
            }
        }
        // Default based on source
        if (input.sourceSystem === 'slack')
            return 'P2';
        if (input.reportedBy?.includes('customer'))
            return 'P2';
        return 'P3';
    }
    classifyArea(text, input) {
        let bestArea = 'backend';
        let bestScore = 0;
        for (const pattern of this.config.areaPatterns) {
            const score = pattern.keywords.filter((k) => text.includes(k.toLowerCase())).length;
            if (score > bestScore) {
                bestScore = score;
                bestArea = pattern.area;
            }
        }
        return bestArea;
    }
    assessAgentEligibility(text, input) {
        const criteria = this.config.agentEligibilityCriteria;
        // Check for excluded keywords
        for (const keyword of criteria.excludedKeywords) {
            if (text.includes(keyword.toLowerCase())) {
                return {
                    eligible: false,
                    reason: `Contains "${keyword}" which requires human judgment`,
                };
            }
        }
        // Check complexity
        const complexityScore = this.calculateComplexity(text);
        if (complexityScore > criteria.maxComplexityScore) {
            return {
                eligible: false,
                reason: `Complexity score ${complexityScore} exceeds threshold ${criteria.maxComplexityScore}`,
            };
        }
        // Check for required patterns
        const hasAcceptanceCriteria = text.includes('acceptance criteria') ||
            text.includes('expected:') ||
            text.includes('should:') ||
            text.includes('test case');
        if (!hasAcceptanceCriteria) {
            return {
                eligible: false,
                reason: 'Missing clear acceptance criteria',
            };
        }
        return {
            eligible: true,
            reason: 'Clear requirements, well-scoped, suitable for agent',
        };
    }
    estimateEffort(text, type, area) {
        let baseHours = 4;
        // Find matching effort rule
        for (const rule of this.config.effortEstimationRules) {
            if (text.includes(rule.condition) || type.includes(rule.condition)) {
                baseHours = rule.baseHours * rule.multiplier;
                break;
            }
        }
        // Adjust for complexity
        const complexity = this.calculateComplexity(text);
        baseHours *= 1 + complexity * 0.1;
        // Adjust for area
        const areaMultipliers = {
            frontend: 1.0,
            backend: 1.1,
            data: 1.2,
            infra: 1.3,
            security: 1.4,
            ai: 1.5,
        };
        baseHours *= areaMultipliers[area ?? 'unknown'] ?? 1;
        return Math.round(baseHours);
    }
    assessRisk(text) {
        let score = 0;
        const factors = [];
        for (const pattern of this.config.riskFactorPatterns) {
            if (text.includes(pattern.pattern.toLowerCase())) {
                score += pattern.riskLevel;
                factors.push(pattern.description);
            }
        }
        return { score: Math.min(100, score), factors };
    }
    async findSimilarTickets(title, description) {
        const tickets = await this.graphStore.getNodes({ type: 'ticket' });
        const titleWords = new Set(title.toLowerCase().split(/\s+/));
        const descWords = new Set(description.toLowerCase().split(/\s+/).slice(0, 50));
        const similar = [];
        for (const ticket of tickets) {
            const ticketWords = new Set(`${ticket.title} ${ticket.description}`.toLowerCase().split(/\s+/));
            const intersection = [...titleWords].filter((w) => ticketWords.has(w));
            const similarity = intersection.length / titleWords.size;
            if (similarity > 0.3) {
                similar.push({
                    id: ticket.id,
                    title: ticket.title,
                    status: ticket.status,
                    similarity,
                    resolution: ticket.status === 'done' ? 'completed' : undefined,
                });
            }
        }
        return similar.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
    }
    generateSuggestions(type, priority, area, similar) {
        const suggestions = [];
        // Suggest linking to similar tickets
        for (const s of similar.filter((t) => t.similarity > 0.7)) {
            suggestions.push({
                type: s.status === 'done' ? 'link_ticket' : 'merge_duplicate',
                target: s.id,
                reason: `${Math.round(s.similarity * 100)}% similar to "${s.title}"`,
                confidence: s.similarity,
            });
        }
        // Suggest escalation for high priority
        if (priority === 'P0') {
            suggestions.push({
                type: 'escalate',
                reason: 'P0 priority requires immediate attention',
                confidence: 0.95,
            });
        }
        // Suggest labels
        suggestions.push({
            type: 'add_label',
            target: area,
            reason: `Classified as ${area} area`,
            confidence: 0.8,
        });
        return suggestions;
    }
    // ============================================
    // Helper Methods
    // ============================================
    calculateComplexity(text) {
        let score = 0;
        // Length factor
        if (text.length > 2000)
            score += 2;
        else if (text.length > 1000)
            score += 1;
        // Technical complexity indicators
        const complexityIndicators = [
            'migration',
            'architecture',
            'integration',
            'distributed',
            'concurrent',
            'async',
            'transaction',
            'rollback',
            'backward compatible',
        ];
        score += complexityIndicators.filter((i) => text.includes(i)).length;
        return score;
    }
    calculateConfidence(text, type, priority, area) {
        let confidence = 0.5;
        // More keywords matched = higher confidence
        const typeKeywords = this.countMatchedKeywords(text, type);
        const priorityMatched = Object.values(this.config.priorityKeywords)
            .flat()
            .some((k) => text.includes(k.toLowerCase()));
        const areaPattern = this.config.areaPatterns.find((p) => p.area === area);
        const areaMatched = areaPattern?.keywords.filter((k) => text.includes(k)).length ?? 0;
        confidence += typeKeywords * 0.05;
        if (priorityMatched)
            confidence += 0.1;
        confidence += areaMatched * 0.03;
        // Clear structure increases confidence
        if (text.includes('expected') && text.includes('actual'))
            confidence += 0.1;
        if (text.includes('steps to reproduce'))
            confidence += 0.1;
        return Math.min(0.95, confidence);
    }
    countMatchedKeywords(text, type) {
        const typeIndicators = {
            bug: ['bug', 'error', 'crash', 'broken', 'fix'],
            feature: ['feature', 'new', 'add', 'implement'],
            tech_debt: ['refactor', 'cleanup', 'debt'],
            docs: ['docs', 'documentation'],
            test: ['test', 'coverage'],
            security: ['security', 'vulnerability'],
            incident: ['incident', 'outage'],
        };
        return (typeIndicators[type] ?? []).filter((k) => text.includes(k)).length;
    }
    explainTypeClassification(text, type) {
        const matchedKeywords = this.countMatchedKeywords(text, type);
        return `Classified as ${type} based on ${matchedKeywords} matching keyword(s)`;
    }
    explainPriorityAssessment(text, priority) {
        const keywords = this.config.priorityKeywords[priority];
        const matched = keywords.filter((k) => text.includes(k.toLowerCase()));
        if (matched.length > 0) {
            return `Set to ${priority} due to keywords: ${matched.join(', ')}`;
        }
        return `Defaulted to ${priority} based on context`;
    }
    explainAreaClassification(text, area) {
        const pattern = this.config.areaPatterns.find((p) => p.area === area);
        const matched = pattern?.keywords.filter((k) => text.includes(k)) ?? [];
        return `Classified as ${area} based on: ${matched.slice(0, 3).join(', ')}`;
    }
    explainEstimate(type, area, hours) {
        return `Estimated ${hours}h based on ${type} type in ${area} area`;
    }
}
exports.AutoTriageEngine = AutoTriageEngine;
