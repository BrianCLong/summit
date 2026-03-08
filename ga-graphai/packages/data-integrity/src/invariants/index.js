"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvariantEngine = void 0;
exports.uniquenessRule = uniquenessRule;
exports.requiredRelationshipRule = requiredRelationshipRule;
exports.cycleRule = cycleRule;
class InvariantEngine {
    rules;
    constructor(rules) {
        this.rules = rules;
    }
    runBoundaryChecks(candidate) {
        const violations = [];
        for (const rule of this.rules) {
            if (!rule.checkBoundary)
                continue;
            const violation = rule.checkBoundary(candidate);
            if (violation) {
                violations.push(violation);
            }
        }
        return violations;
    }
    runAudit(candidates) {
        const violations = [];
        for (const rule of this.rules) {
            if (!rule.checkAudit)
                continue;
            const violation = rule.checkAudit(candidates);
            if (violation) {
                violations.push(violation);
            }
        }
        return violations;
    }
}
exports.InvariantEngine = InvariantEngine;
function uniquenessRule(scope, severity = 'block') {
    return {
        id: `${scope}-unique-id`,
        description: 'IDs must be unique within scope',
        severity,
        checkAudit: (candidates) => {
            const seen = new Set();
            const duplicates = [];
            for (const candidate of candidates) {
                if (seen.has(candidate.id)) {
                    duplicates.push(candidate.id);
                }
                seen.add(candidate.id);
            }
            if (duplicates.length > 0) {
                return {
                    ruleId: `${scope}-unique-id`,
                    message: `Duplicate IDs detected: ${duplicates.join(', ')}`,
                    affectedIds: duplicates,
                    severity,
                    remediation: 'Normalize upstream ID generation or de-duplicate records',
                };
            }
            return undefined;
        },
    };
}
function requiredRelationshipRule(relation, requiredIds, severity = 'block') {
    return {
        id: `${relation}-required`,
        description: `Entities must reference ${relation}`,
        severity,
        checkBoundary: (candidate) => {
            if (!requiredIds.has(candidate.id)) {
                return {
                    ruleId: `${relation}-required`,
                    message: `Missing required relationship ${relation}`,
                    affectedIds: [candidate.id],
                    severity,
                    remediation: `Provide a valid ${relation} reference before persisting`,
                };
            }
            return undefined;
        },
    };
}
function cycleRule(edges, severity = 'warn') {
    return {
        id: 'graph-cycle-check',
        description: 'Detect bounded cycles',
        severity,
        checkAudit: () => {
            const adjacency = new Map();
            for (const edge of edges) {
                if (!adjacency.has(edge.from))
                    adjacency.set(edge.from, new Set());
                adjacency.get(edge.from).add(edge.to);
            }
            const visited = new Set();
            const stack = new Set();
            const detect = (node, depth) => {
                if (depth > 10)
                    return false;
                if (!adjacency.has(node))
                    return false;
                visited.add(node);
                stack.add(node);
                for (const neighbor of adjacency.get(node)) {
                    if (!visited.has(neighbor) && detect(neighbor, depth + 1))
                        return true;
                    if (stack.has(neighbor))
                        return true;
                }
                stack.delete(node);
                return false;
            };
            for (const node of adjacency.keys()) {
                if (detect(node, 0)) {
                    return {
                        ruleId: 'graph-cycle-check',
                        message: 'Cycle detected in bounded traversal',
                        affectedIds: Array.from(stack),
                        severity,
                        remediation: 'Review recent relationships and remove circular dependencies',
                    };
                }
            }
            return undefined;
        },
    };
}
