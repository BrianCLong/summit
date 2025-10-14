// System-level Mixture-of-Experts Router
// Routes tasks to the optimal expert based on task characteristics and constraints
export class MoERouter {
    constructor() {
        this.routingHistory = new Map();
        this.expertCapabilities = {
            LLM_LIGHT: {
                type: 'LLM_LIGHT',
                costPerToken: 0.0001,
                avgLatencyMs: 800,
                maxTokens: 2000,
                supportedModalities: ['text'],
                securityLevel: 'low',
                description: 'Fast, lightweight language model for simple queries',
            },
            LLM_HEAVY: {
                type: 'LLM_HEAVY',
                costPerToken: 0.001,
                avgLatencyMs: 3000,
                maxTokens: 8000,
                supportedModalities: ['text', 'reasoning'],
                securityLevel: 'medium',
                description: 'Powerful language model with MoE architecture for complex tasks',
            },
            GRAPH_TOOL: {
                type: 'GRAPH_TOOL',
                costPerToken: 0.0001,
                avgLatencyMs: 500,
                maxTokens: 10000,
                supportedModalities: ['cypher', 'graph-analysis'],
                securityLevel: 'high',
                description: 'Neo4j graph operations via MCP',
            },
            RAG_TOOL: {
                type: 'RAG_TOOL',
                costPerToken: 0.0005,
                avgLatencyMs: 1200,
                maxTokens: 4000,
                supportedModalities: ['text', 'retrieval'],
                securityLevel: 'medium',
                description: 'Retrieval-augmented generation for contextual answers',
            },
            FILES_TOOL: {
                type: 'FILES_TOOL',
                costPerToken: 0.0002,
                avgLatencyMs: 600,
                maxTokens: 5000,
                supportedModalities: ['files', 'documents'],
                securityLevel: 'high',
                description: 'File operations with policy controls via MCP',
            },
            OSINT_TOOL: {
                type: 'OSINT_TOOL',
                costPerToken: 0.0003,
                avgLatencyMs: 2000,
                maxTokens: 3000,
                supportedModalities: ['web', 'osint'],
                securityLevel: 'medium',
                description: 'Open source intelligence gathering via MCP',
            },
            EXPORT_TOOL: {
                type: 'EXPORT_TOOL',
                costPerToken: 0.0001,
                avgLatencyMs: 1000,
                maxTokens: 10000,
                supportedModalities: ['export', 'documents'],
                securityLevel: 'high',
                description: 'Export operations for reports and case files',
            },
        };
    }
    /**
     * Route a task to the best expert based on task characteristics
     */
    route(input) {
        const features = this.extractFeatures(input);
        const candidates = this.getCandidateExperts(features);
        const selected = this.selectBestExpert(candidates, features);
        const decision = {
            expert: selected.expert,
            reason: selected.reason,
            confidence: selected.confidence,
            features: features,
            alternatives: candidates.filter((c) => c !== selected.expert),
        };
        // Store for learning and metrics
        this.routingHistory.set(this.generateTaskKey(input), decision);
        return decision;
    }
    /**
     * Extract routing features from the input task
     */
    extractFeatures(input) {
        const task = input.task.toLowerCase();
        return {
            taskLength: input.task.length,
            hasGraphKeywords: this.hasGraphKeywords(task),
            hasFileKeywords: this.hasFileKeywords(task),
            hasOSINTKeywords: this.hasOSINTKeywords(task),
            hasExportKeywords: this.hasExportKeywords(task),
            complexityScore: this.calculateComplexity(task),
            sensitivityLevel: input.sensitivity || 'low',
            maxLatencyMs: input.maxLatencyMs || 4000,
            userRole: input.userContext?.role,
            investigationContext: !!input.investigationId,
        };
    }
    /**
     * Check for graph-related keywords
     */
    hasGraphKeywords(task) {
        const graphKeywords = [
            'cypher',
            'graph',
            'pagerank',
            'betweenness',
            'neighbors',
            'neo4j',
            'relationship',
            'node',
            'edge',
            'community',
            'centrality',
            'path',
            'shortest',
            'traverse',
            'match',
            'return',
            'where',
        ];
        return graphKeywords.some((keyword) => task.includes(keyword));
    }
    /**
     * Check for file-related keywords
     */
    hasFileKeywords(task) {
        const fileKeywords = [
            'file',
            'document',
            'upload',
            'download',
            'pdf',
            'docx',
            'csv',
            'attachment',
            'blob',
            'storage',
            'read',
            'write',
            'search files',
        ];
        return fileKeywords.some((keyword) => task.includes(keyword));
    }
    /**
     * Check for OSINT-related keywords
     */
    hasOSINTKeywords(task) {
        const osintKeywords = [
            'web',
            'search',
            'scrape',
            'fetch',
            'url',
            'domain',
            'whois',
            'threat intelligence',
            'osint',
            'external',
            'public',
            'social media',
        ];
        return osintKeywords.some((keyword) => task.includes(keyword));
    }
    /**
     * Check for export-related keywords
     */
    hasExportKeywords(task) {
        const exportKeywords = [
            'export',
            'report',
            'generate',
            'case file',
            'summary',
            'pdf report',
            'dashboard',
            'visualization',
            'chart',
            'download report',
        ];
        return exportKeywords.some((keyword) => task.includes(keyword));
    }
    /**
     * Calculate task complexity score
     */
    calculateComplexity(task) {
        let score = 0;
        // Length-based complexity
        if (task.length > 1000)
            score += 3;
        else if (task.length > 500)
            score += 2;
        else if (task.length > 100)
            score += 1;
        // Complexity keywords
        const complexKeywords = [
            'analyze',
            'complex',
            'deep',
            'comprehensive',
            'detailed',
            'multi-step',
            'advanced',
            'forensic',
            'investigation',
            'legal',
            'policy',
            'regulatory',
        ];
        complexKeywords.forEach((keyword) => {
            if (task.includes(keyword))
                score += 1;
        });
        return Math.min(score, 10); // Cap at 10
    }
    /**
     * Get candidate experts based on features
     */
    getCandidateExperts(features) {
        const candidates = [];
        // Rule-based candidate selection
        if (features.hasGraphKeywords) {
            candidates.push('GRAPH_TOOL');
        }
        if (features.hasFileKeywords) {
            candidates.push('FILES_TOOL');
        }
        if (features.hasOSINTKeywords) {
            candidates.push('OSINT_TOOL');
        }
        if (features.hasExportKeywords) {
            candidates.push('EXPORT_TOOL');
        }
        // Always include LLM options
        if (features.maxLatencyMs < 1500 || features.complexityScore <= 2) {
            candidates.push('LLM_LIGHT');
        }
        if (features.complexityScore >= 5 || features.taskLength > 1000) {
            candidates.push('LLM_HEAVY');
        }
        // Default to RAG for general queries
        if (candidates.length === 0 || features.investigationContext) {
            candidates.push('RAG_TOOL');
        }
        // Remove duplicates
        return [...new Set(candidates)];
    }
    /**
     * Select the best expert from candidates
     */
    selectBestExpert(candidates, features) {
        // Priority-based selection with confidence scoring
        for (const candidate of candidates) {
            const capability = this.expertCapabilities[candidate];
            // Check latency constraints
            if (capability.avgLatencyMs && capability.avgLatencyMs > features.maxLatencyMs) {
                continue;
            }
            // Check security constraints
            if (features.sensitivityLevel === 'secret' && capability.securityLevel === 'low') {
                continue;
            }
            // Calculate confidence based on feature matching
            const confidence = this.calculateConfidence(candidate, features);
            // Return first viable candidate with reasoning
            return {
                expert: candidate,
                reason: this.generateReason(candidate, features),
                confidence,
            };
        }
        // Fallback to LLM_LIGHT
        return {
            expert: 'LLM_LIGHT',
            reason: 'Fallback to lightweight LLM - no specific tool matches found',
            confidence: 0.5,
        };
    }
    /**
     * Calculate confidence score for expert selection
     */
    calculateConfidence(expert, features) {
        let confidence = 0.5; // Base confidence
        switch (expert) {
            case 'GRAPH_TOOL':
                if (features.hasGraphKeywords)
                    confidence += 0.4;
                break;
            case 'FILES_TOOL':
                if (features.hasFileKeywords)
                    confidence += 0.4;
                break;
            case 'OSINT_TOOL':
                if (features.hasOSINTKeywords)
                    confidence += 0.4;
                break;
            case 'EXPORT_TOOL':
                if (features.hasExportKeywords)
                    confidence += 0.4;
                break;
            case 'LLM_HEAVY':
                if (features.complexityScore >= 5)
                    confidence += 0.3;
                if (features.taskLength > 1000)
                    confidence += 0.2;
                break;
            case 'LLM_LIGHT':
                if (features.maxLatencyMs < 1500)
                    confidence += 0.3;
                if (features.complexityScore <= 2)
                    confidence += 0.2;
                break;
            case 'RAG_TOOL':
                if (features.investigationContext)
                    confidence += 0.3;
                break;
        }
        return Math.min(confidence, 1.0);
    }
    /**
     * Generate human-readable reasoning
     */
    generateReason(expert, features) {
        const reasons = [];
        switch (expert) {
            case 'GRAPH_TOOL':
                if (features.hasGraphKeywords)
                    reasons.push('graph-related keywords detected');
                break;
            case 'FILES_TOOL':
                if (features.hasFileKeywords)
                    reasons.push('file operations required');
                break;
            case 'OSINT_TOOL':
                if (features.hasOSINTKeywords)
                    reasons.push('OSINT/web research needed');
                break;
            case 'EXPORT_TOOL':
                if (features.hasExportKeywords)
                    reasons.push('export/report generation requested');
                break;
            case 'LLM_HEAVY':
                if (features.complexityScore >= 5)
                    reasons.push('high complexity task');
                if (features.taskLength > 1000)
                    reasons.push('long-form content');
                break;
            case 'LLM_LIGHT':
                if (features.maxLatencyMs < 1500)
                    reasons.push('tight latency budget');
                if (features.complexityScore <= 2)
                    reasons.push('simple query');
                break;
            case 'RAG_TOOL':
                if (features.investigationContext)
                    reasons.push('investigation context available');
                reasons.push('general knowledge retrieval');
                break;
        }
        return reasons.length > 0 ? reasons.join(', ') : 'best available option';
    }
    /**
     * Generate a unique key for task caching
     */
    generateTaskKey(input) {
        const hash = input.task.substring(0, 50) + (input.investigationId || '');
        return Buffer.from(hash).toString('base64').substring(0, 16);
    }
    /**
     * Get routing statistics for observability
     */
    getRoutingStats() {
        const decisions = Array.from(this.routingHistory.values());
        const expertCounts = {};
        let totalConfidence = 0;
        decisions.forEach((decision) => {
            expertCounts[decision.expert] = (expertCounts[decision.expert] || 0) + 1;
            totalConfidence += decision.confidence;
        });
        return {
            totalDecisions: decisions.length,
            expertDistribution: expertCounts,
            avgConfidence: decisions.length > 0 ? totalConfidence / decisions.length : 0,
        };
    }
}
// Export singleton instance
export const moERouter = new MoERouter();
//# sourceMappingURL=index.js.map