"use strict";
/**
 * PropagationEngine - Multi-order outcome propagation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PropagationEngine = void 0;
exports.createDefaultContext = createDefaultContext;
const OutcomeNode_js_1 = require("../models/OutcomeNode.js");
const DampingCalculator_js_1 = require("./DampingCalculator.js");
class PropagationEngine {
    dampingCalculator;
    constructor() {
        this.dampingCalculator = new DampingCalculator_js_1.DampingCalculator();
    }
    /**
     * Propagate outcomes from root event through multiple orders
     */
    propagateOutcomes(rootEvent, options, context) {
        const outcomes = [];
        const visited = new Set();
        // Create root node
        const rootNode = this.createRootNode(rootEvent);
        const queue = [[rootNode, 1]];
        while (queue.length > 0) {
            const [node, order] = queue.shift();
            // Check termination conditions
            if (order > options.maxOrder)
                continue;
            if (visited.has(node.id))
                continue;
            if (node.probability < options.probabilityThreshold)
                continue;
            if (Math.abs(node.magnitude) < options.magnitudeThreshold)
                continue;
            visited.add(node.id);
            outcomes.push(node);
            // Find causal links
            const causalLinks = this.findCausalLinks(node, context);
            // Create child nodes
            for (const link of causalLinks) {
                // Skip weak links unless explicitly included
                if (!options.includeWeakLinks && link.strength < 0.3)
                    continue;
                const childNode = this.createChildNode(node, link, order + 1, context);
                // Add to parent's children
                node.childNodes.push(childNode.id);
                // Add to queue for further propagation
                queue.push([childNode, order + 1]);
            }
        }
        return outcomes;
    }
    /**
     * Find causal links from a node using knowledge base
     */
    findCausalLinks(node, context) {
        // Check knowledge base for known causal relationships
        const knownLinks = context.knowledgeBase.get(node.event) || [];
        // Generate domain-specific links
        const domainLinks = this.generateDomainLinks(node, context);
        // Combine and deduplicate
        const allLinks = [...knownLinks, ...domainLinks];
        return allLinks;
    }
    /**
     * Generate causal links based on domain rules
     */
    generateDomainLinks(node, context) {
        const domainRule = context.domainRules.get(node.domain);
        if (!domainRule)
            return [];
        const links = [];
        // Generate links based on domain patterns
        const linkCount = Math.floor(domainRule.branchingFactor * Math.random() + 1);
        for (let i = 0; i < linkCount; i++) {
            links.push(this.generateLink(node, domainRule, i));
        }
        return links;
    }
    /**
     * Generate a single causal link
     */
    generateLink(node, domainRule, index) {
        // Domain transition patterns
        const targetDomains = this.getTargetDomains(node.domain);
        const targetDomain = targetDomains[Math.floor(Math.random() * targetDomains.length)];
        return {
            targetEvent: this.generateEventDescription(node, targetDomain, index),
            domain: targetDomain,
            baseProbability: 0.3 + Math.random() * 0.5,
            baseMagnitude: node.magnitude * (0.5 + Math.random() * 0.5),
            timeDelay: domainRule.timeScale * (1 + Math.random() * 2),
            evidenceQuality: 0.4 + Math.random() * 0.4,
            strength: 0.4 + Math.random() * 0.5,
        };
    }
    /**
     * Get possible target domains from source domain
     */
    getTargetDomains(sourceDomain) {
        const transitions = {
            POLICY: ['ECONOMIC', 'SOCIAL', 'POLITICAL'],
            ECONOMIC: ['SOCIAL', 'POLITICAL', 'TECHNOLOGY'],
            GEOPOLITICAL: ['ECONOMIC', 'MILITARY', 'DIPLOMATIC'],
            TECHNOLOGY: ['ECONOMIC', 'SOCIAL', 'SECURITY'],
            SOCIAL: ['POLITICAL', 'ECONOMIC', 'CULTURAL'],
            MILITARY: ['GEOPOLITICAL', 'ECONOMIC', 'HUMANITARIAN'],
            POLITICAL: ['POLICY', 'SOCIAL', 'ECONOMIC'],
            SECURITY: ['POLITICAL', 'TECHNOLOGY', 'SOCIAL'],
        };
        return transitions[sourceDomain] || ['UNKNOWN'];
    }
    /**
     * Generate event description based on domain
     */
    generateEventDescription(parentNode, targetDomain, index) {
        const patterns = {
            ECONOMIC: [
                'Market disruption',
                'Price volatility',
                'Supply chain impact',
                'Investment shift',
            ],
            SOCIAL: [
                'Public opinion shift',
                'Social unrest',
                'Demographic change',
                'Cultural adaptation',
            ],
            POLITICAL: [
                'Policy response',
                'Political realignment',
                'Regulatory change',
                'Leadership transition',
            ],
            TECHNOLOGY: [
                'Innovation acceleration',
                'Technology adoption',
                'Digital transformation',
                'Cybersecurity concern',
            ],
            SECURITY: [
                'Security threat',
                'Risk escalation',
                'Defense posture change',
                'Intelligence requirement',
            ],
        };
        const domainPatterns = patterns[targetDomain] || ['Consequence'];
        const pattern = domainPatterns[index % domainPatterns.length];
        return `${pattern} (from: ${parentNode.event.substring(0, 30)}...)`;
    }
    /**
     * Create root node from input
     */
    createRootNode(input) {
        return new OutcomeNode_js_1.OutcomeNodeBuilder(input.event, 1)
            .withDomain(input.domain)
            .withMagnitude(input.initialMagnitude || 1.0)
            .withProbability(1.0)
            .withConfidence(0.9)
            .withEvidenceStrength(1.0)
            .withTimeDelay(0)
            .build();
    }
    /**
     * Create child node from parent and causal link
     */
    createChildNode(parent, link, order, context) {
        // Calculate dampening
        const dampening = this.dampingCalculator.calculateDampening(order, link);
        // Create child node
        const child = new OutcomeNode_js_1.OutcomeNodeBuilder(link.targetEvent, order)
            .withDomain(link.domain)
            .withProbability(parent.probability * link.baseProbability * dampening)
            .withMagnitude(link.baseMagnitude * dampening)
            .withTimeDelay(parent.timeDelay + link.timeDelay)
            .withConfidence(parent.confidence * 0.9)
            .withEvidenceStrength(link.evidenceQuality)
            .withParents([parent.id])
            .build();
        return child;
    }
}
exports.PropagationEngine = PropagationEngine;
/**
 * Create default graph context for testing/demo
 */
function createDefaultContext() {
    const knowledgeBase = new Map();
    const domainRules = new Map();
    // Default domain rules
    const domains = [
        'POLICY',
        'ECONOMIC',
        'GEOPOLITICAL',
        'TECHNOLOGY',
        'SOCIAL',
        'MILITARY',
        'POLITICAL',
        'SECURITY',
    ];
    for (const domain of domains) {
        domainRules.set(domain, {
            domain,
            branchingFactor: 2.5,
            dampening: 0.7,
            timeScale: 24, // hours
        });
    }
    return { knowledgeBase, domainRules };
}
