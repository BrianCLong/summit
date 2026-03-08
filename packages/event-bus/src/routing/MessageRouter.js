"use strict";
/**
 * MessageRouter - Advanced message routing and filtering
 *
 * Content-based routing, topic patterns, and message filtering
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TopicMatcher = exports.MessageRouter = void 0;
class MessageRouter {
    rules = new Map();
    /**
     * Add a routing rule
     */
    addRule(rule) {
        this.rules.set(rule.id, rule);
    }
    /**
     * Remove a routing rule
     */
    removeRule(ruleId) {
        this.rules.delete(ruleId);
    }
    /**
     * Route a message to appropriate destinations
     */
    route(message) {
        const routes = [];
        // Sort rules by priority
        const sortedRules = Array.from(this.rules.values()).sort((a, b) => (b.priority || 0) - (a.priority || 0));
        for (const rule of sortedRules) {
            if (this.matchesRule(message, rule)) {
                const routedMessage = rule.transform
                    ? rule.transform(message)
                    : message;
                routes.push({
                    destination: rule.destination,
                    message: routedMessage
                });
            }
        }
        return routes;
    }
    /**
     * Check if message matches routing rule
     */
    matchesRule(message, rule) {
        // Check source filter
        if (rule.source) {
            const sources = Array.isArray(rule.source) ? rule.source : [rule.source];
            if (!sources.includes(message.metadata.source)) {
                return false;
            }
        }
        // Check message filter
        if (rule.filter) {
            if (!this.matchesFilter(message, rule.filter)) {
                return false;
            }
        }
        return true;
    }
    /**
     * Check if message matches filter criteria
     */
    matchesFilter(message, filter) {
        // Check headers
        if (filter.headers) {
            for (const [key, value] of Object.entries(filter.headers)) {
                const headerValue = message.metadata.headers?.[key];
                if (!headerValue)
                    return false;
                if (!headerValue) {
                    return false;
                }
                const allowedValues = Array.isArray(value) ? value : [value];
                if (!allowedValues.includes(headerValue)) {
                    return false;
                }
            }
        }
        // Check content type
        if (filter.contentType &&
            message.metadata.contentType &&
            !filter.contentType.includes(message.metadata.contentType)) {
            return false;
        }
        // Check source
        if (filter.source &&
            !filter.source.includes(message.metadata.source)) {
            return false;
        }
        // Custom filter function
        if (filter.custom && !filter.custom(message)) {
            return false;
        }
        return true;
    }
    /**
     * Get all routing rules
     */
    getRules() {
        return Array.from(this.rules.values());
    }
}
exports.MessageRouter = MessageRouter;
/**
 * Topic pattern matching utilities
 */
class TopicMatcher {
    /**
     * Check if topic matches pattern
     * Supports wildcards: * (single level), # (multi-level)
     */
    static matches(topic, pattern) {
        // Direct match
        if (topic === pattern)
            return true;
        // Multi-level wildcard
        if (pattern === '#')
            return true;
        if (topic === pattern) {
            return true;
        }
        // Multi-level wildcard
        if (pattern === '#') {
            return true;
        }
        const topicParts = topic.split('.');
        const patternParts = pattern.split('.');
        return this.matchParts(topicParts, patternParts);
    }
    static matchParts(topicParts, patternParts) {
        let ti = 0;
        let pi = 0;
        while (ti < topicParts.length && pi < patternParts.length) {
            const pattern = patternParts[pi];
            if (pattern === '#') {
                // Multi-level wildcard matches rest of topic
                return true;
            }
            if (pattern === '*') {
                // Single-level wildcard
                ti++;
                pi++;
                continue;
            }
            if (topicParts[ti] !== pattern) {
                return false;
            }
            ti++;
            pi++;
        }
        // Check if we consumed all parts
        return ti === topicParts.length && pi === patternParts.length;
    }
}
exports.TopicMatcher = TopicMatcher;
