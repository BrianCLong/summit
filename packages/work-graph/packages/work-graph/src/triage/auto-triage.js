"use strict";
/**
 * Summit Work Graph - AI-Powered Auto-Triage
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoTriage = void 0;
const DEFAULT_CONFIG = {
    priorityKeywords: {
        P0: ['outage', 'down', 'critical', 'security breach', 'data loss', 'production crash'],
        P1: ['urgent', 'blocker', 'security', 'performance degradation', 'customer escalation'],
        P2: ['important', 'regression', 'significant', 'multiple customers'],
        P3: ['nice to have', 'minor', 'cosmetic', 'improvement'],
    },
    typeKeywords: {
        bug: ['bug', 'error', 'broken', 'fix', 'crash', 'exception', 'incorrect'],
        feature: ['feature', 'new', 'implement', 'add', 'create', 'build'],
        task: ['task', 'chore', 'maintenance', 'cleanup', 'refactor'],
        improvement: ['improve', 'enhance', 'optimize', 'update', 'upgrade'],
        security: ['security', 'vulnerability', 'cve', 'audit', 'penetration'],
    },
    areaKeywords: {
        frontend: ['ui', 'frontend', 'react', 'component', 'css', 'style', 'button', 'form'],
        backend: ['api', 'backend', 'server', 'endpoint', 'database', 'query'],
        infrastructure: ['infra', 'deploy', 'ci', 'cd', 'docker', 'kubernetes', 'terraform'],
        data: ['data', 'analytics', 'reporting', 'metric', 'dashboard'],
        auth: ['auth', 'login', 'permission', 'rbac', 'sso', 'oauth'],
    },
    effortRules: [
        { condition: { field: 'type', operator: 'equals', value: 'bug' }, estimate: 2, complexity: 'simple' },
        { condition: { field: 'description', operator: 'contains', value: 'migration' }, estimate: 8, complexity: 'complex' },
        { condition: { field: 'description', operator: 'contains', value: 'refactor' }, estimate: 5, complexity: 'medium' },
    ],
};
class AutoTriage {
    config;
    ticketHistory = [];
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    async triageTicket(ticket) {
        const text = ((ticket.title || '') + ' ' + (ticket.description || '')).toLowerCase();
        const reasoning = [];
        // Classify priority
        const priority = this.classifyPriority(text, reasoning);
        // Classify type
        const type = this.classifyType(text, reasoning);
        // Classify area
        const area = this.classifyArea(text, reasoning);
        // Estimate effort and complexity
        const { estimate, complexity } = this.estimateEffort(ticket, type, reasoning);
        // Determine agent eligibility
        const agentEligible = this.assessAgentEligibility(priority, type, complexity, reasoning);
        // Calculate risk score
        const riskScore = this.calculateRiskScore(priority, type, complexity);
        // Suggest labels
        const suggestedLabels = this.suggestLabels(type, area, priority);
        // Calculate confidence
        const confidence = this.calculateConfidence(reasoning);
        return {
            priority,
            type,
            area,
            complexity,
            estimate,
            agentEligible,
            confidence,
            reasoning,
            suggestedLabels,
            riskScore,
        };
    }
    classifyPriority(text, reasoning) {
        for (const [priority, keywords] of Object.entries(this.config.priorityKeywords)) {
            if (keywords.some(k => text.includes(k))) {
                reasoning.push('Priority ' + priority + ': matched keyword in text');
                return priority;
            }
        }
        reasoning.push('Priority P2: default priority (no keywords matched)');
        return 'P2';
    }
    classifyType(text, reasoning) {
        for (const [type, keywords] of Object.entries(this.config.typeKeywords)) {
            if (keywords.some(k => text.includes(k))) {
                reasoning.push('Type ' + type + ': matched keyword in text');
                return type;
            }
        }
        reasoning.push('Type task: default type (no keywords matched)');
        return 'task';
    }
    classifyArea(text, reasoning) {
        for (const [area, keywords] of Object.entries(this.config.areaKeywords)) {
            if (keywords.some(k => text.includes(k))) {
                reasoning.push('Area ' + area + ': matched keyword in text');
                return area;
            }
        }
        reasoning.push('Area general: no specific area detected');
        return 'general';
    }
    estimateEffort(ticket, type, reasoning) {
        for (const rule of this.config.effortRules) {
            const value = ticket[rule.condition.field];
            if (rule.condition.operator === 'equals' && value === rule.condition.value) {
                reasoning.push('Effort ' + rule.estimate + 'h: matched rule for ' + rule.condition.field);
                return { estimate: rule.estimate, complexity: rule.complexity };
            }
            if (rule.condition.operator === 'contains' && typeof value === 'string' && value.toLowerCase().includes(String(rule.condition.value).toLowerCase())) {
                reasoning.push('Effort ' + rule.estimate + 'h: matched contains rule');
                return { estimate: rule.estimate, complexity: rule.complexity };
            }
        }
        reasoning.push('Effort 3h: default estimate');
        return { estimate: 3, complexity: 'medium' };
    }
    assessAgentEligibility(priority, type, complexity, reasoning) {
        if (priority === 'P0' || priority === 'P1') {
            reasoning.push('Agent ineligible: high priority requires human oversight');
            return false;
        }
        if (type === 'security') {
            reasoning.push('Agent ineligible: security work requires human review');
            return false;
        }
        if (complexity === 'complex') {
            reasoning.push('Agent ineligible: complex work benefits from human judgment');
            return false;
        }
        reasoning.push('Agent eligible: meets criteria for autonomous work');
        return true;
    }
    calculateRiskScore(priority, type, complexity) {
        let score = 0;
        if (priority === 'P0')
            score += 40;
        else if (priority === 'P1')
            score += 25;
        else if (priority === 'P2')
            score += 10;
        if (type === 'security')
            score += 30;
        else if (type === 'bug')
            score += 15;
        if (complexity === 'complex')
            score += 20;
        else if (complexity === 'medium')
            score += 10;
        return Math.min(100, score);
    }
    suggestLabels(type, area, priority) {
        return [type, area, priority.toLowerCase()].filter(Boolean);
    }
    calculateConfidence(reasoning) {
        const matchedRules = reasoning.filter(r => !r.includes('default')).length;
        return Math.min(100, 50 + matchedRules * 15);
    }
    async findSimilarTickets(ticket, limit = 5) {
        const text = ((ticket.title || '') + ' ' + (ticket.description || '')).toLowerCase();
        const words = new Set(text.split(/\s+/).filter(w => w.length > 3));
        return this.ticketHistory
            .map(t => {
            const tText = (t.title + ' ' + t.description).toLowerCase();
            const tWords = new Set(tText.split(/\s+/).filter(w => w.length > 3));
            const intersection = [...words].filter(w => tWords.has(w)).length;
            const union = new Set([...words, ...tWords]).size;
            return { id: t.id, title: t.title, similarity: union > 0 ? intersection / union : 0 };
        })
            .filter(s => s.similarity > 0.1)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);
    }
    addToHistory(ticket) {
        this.ticketHistory.push(ticket);
        if (this.ticketHistory.length > 1000) {
            this.ticketHistory = this.ticketHistory.slice(-500);
        }
    }
}
exports.AutoTriage = AutoTriage;
