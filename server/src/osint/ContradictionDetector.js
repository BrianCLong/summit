"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContradictionDetector = void 0;
const crypto_1 = __importDefault(require("crypto"));
/**
 * ContradictionDetector - Automation Turn #5 Implementation
 *
 * Detects contradictions between claims, including:
 * - Temporal overlaps with conflicting data
 * - Semantic inconsistencies
 * - Logical impossibilities
 */
class ContradictionDetector {
    rules = [];
    constructor() {
        // Register default detection rules
        this.registerRule(new TemporalOverlapRule());
        this.registerRule(new MutualExclusionRule());
        this.registerRule(new NumericRangeRule());
        this.registerRule(new StatusTransitionRule());
    }
    /**
     * Register a custom contradiction detection rule.
     */
    registerRule(rule) {
        this.rules.push(rule);
    }
    /**
     * Detect all contradictions within a set of claims.
     * Uses pairwise comparison with early exit optimization.
     */
    detect(claims) {
        const contradictions = [];
        const seen = new Set();
        for (let i = 0; i < claims.length; i++) {
            for (let j = i + 1; j < claims.length; j++) {
                const claimA = claims[i];
                const claimB = claims[j];
                // Skip if claims are about different subjects
                if (claimA.subject !== claimB.subject)
                    continue;
                // Skip if claims have different predicates (may add cross-predicate rules later)
                if (claimA.predicate !== claimB.predicate)
                    continue;
                // Check all rules
                for (const rule of this.rules) {
                    const match = rule.detect(claimA, claimB);
                    if (match) {
                        const contradictionId = this.generateContradictionId(claimA, claimB, rule.id);
                        // Avoid duplicates
                        if (!seen.has(contradictionId)) {
                            seen.add(contradictionId);
                            contradictions.push({
                                id: contradictionId,
                                claimIdA: claimA.id,
                                claimIdB: claimB.id,
                                reason: `[${rule.name}] ${match.reason}`,
                                detectedAt: new Date().toISOString(),
                                severity: match.severity,
                            });
                        }
                    }
                }
            }
        }
        return contradictions;
    }
    /**
     * Detect contradictions between a new claim and existing claims.
     * Useful for incremental updates.
     */
    detectForClaim(newClaim, existingClaims) {
        const contradictions = [];
        for (const existing of existingClaims) {
            if (existing.id === newClaim.id)
                continue;
            if (existing.subject !== newClaim.subject)
                continue;
            if (existing.predicate !== newClaim.predicate)
                continue;
            for (const rule of this.rules) {
                const match = rule.detect(newClaim, existing);
                if (match) {
                    contradictions.push({
                        id: this.generateContradictionId(newClaim, existing, rule.id),
                        claimIdA: newClaim.id,
                        claimIdB: existing.id,
                        reason: `[${rule.name}] ${match.reason}`,
                        detectedAt: new Date().toISOString(),
                        severity: match.severity,
                    });
                }
            }
        }
        return contradictions;
    }
    generateContradictionId(claimA, claimB, ruleId) {
        // Ensure consistent ordering for deduplication
        const [first, second] = [claimA.id, claimB.id].sort();
        const hash = crypto_1.default
            .createHash('sha256')
            .update(`${first}:${second}:${ruleId}`)
            .digest('hex')
            .substring(0, 12);
        return `contradiction-${hash}`;
    }
}
exports.ContradictionDetector = ContradictionDetector;
/**
 * TemporalOverlapRule - Detects contradictions where claims have overlapping
 * validity periods but different values.
 */
class TemporalOverlapRule {
    id = 'temporal-overlap';
    name = 'Temporal Overlap';
    detect(claimA, claimB) {
        // Must have temporal bounds to check overlap
        if (!this.hasTemporalBounds(claimA) && !this.hasTemporalBounds(claimB)) {
            return null;
        }
        // Check if values are different
        if (this.valuesEqual(claimA.object, claimB.object)) {
            return null;
        }
        // Check temporal overlap
        if (!this.temporallyOverlaps(claimA, claimB)) {
            return null;
        }
        return {
            reason: `Conflicting values "${this.summarize(claimA.object)}" vs "${this.summarize(claimB.object)}" during overlapping time periods`,
            severity: 'high',
        };
    }
    hasTemporalBounds(claim) {
        return !!(claim.validFrom || claim.validTo);
    }
    temporallyOverlaps(a, b) {
        const aFrom = a.validFrom ? new Date(a.validFrom) : new Date(0);
        const aTo = a.validTo ? new Date(a.validTo) : new Date('2100-01-01');
        const bFrom = b.validFrom ? new Date(b.validFrom) : new Date(0);
        const bTo = b.validTo ? new Date(b.validTo) : new Date('2100-01-01');
        return aFrom <= bTo && bFrom <= aTo;
    }
    valuesEqual(a, b) {
        return JSON.stringify(a) === JSON.stringify(b);
    }
    summarize(obj) {
        const str = JSON.stringify(obj);
        return str.length > 30 ? str.substring(0, 27) + '...' : str;
    }
}
/**
 * MutualExclusionRule - Detects contradictions where values are mutually exclusive.
 */
class MutualExclusionRule {
    id = 'mutual-exclusion';
    name = 'Mutual Exclusion';
    exclusionGroups = new Map([
        ['hasStatus', [
                ['active', 'dissolved'],
                ['active', 'inactive'],
                ['dissolved', 'inactive'],
            ]],
        ['hasAccount', []], // Platform-specific accounts are generally not mutually exclusive
    ]);
    detect(claimA, claimB) {
        const exclusions = this.exclusionGroups.get(claimA.predicate);
        if (!exclusions || exclusions.length === 0) {
            return null;
        }
        // If temporal information is available, check for overlap
        // If either claim lacks temporal info, we assume it applies indefinitely (so it overlaps)
        if (this.hasTemporalBounds(claimA) && this.hasTemporalBounds(claimB)) {
            if (!this.temporallyOverlaps(claimA, claimB)) {
                return null;
            }
        }
        const valueA = this.extractValue(claimA.object);
        const valueB = this.extractValue(claimB.object);
        if (valueA === valueB) {
            return null;
        }
        for (const [excA, excB] of exclusions) {
            if ((valueA === excA && valueB === excB) ||
                (valueA === excB && valueB === excA)) {
                return {
                    reason: `Values "${valueA}" and "${valueB}" are mutually exclusive`,
                    severity: 'high',
                };
            }
        }
        return null;
    }
    hasTemporalBounds(claim) {
        return !!(claim.validFrom || claim.validTo);
    }
    temporallyOverlaps(a, b) {
        const aFrom = a.validFrom ? new Date(a.validFrom) : new Date(0);
        const aTo = a.validTo ? new Date(a.validTo) : new Date('2100-01-01');
        const bFrom = b.validFrom ? new Date(b.validFrom) : new Date(0);
        const bTo = b.validTo ? new Date(b.validTo) : new Date('2100-01-01');
        return aFrom <= bTo && bFrom <= aTo;
    }
    extractValue(obj) {
        if (typeof obj === 'string')
            return obj;
        if (typeof obj === 'object' && obj !== null && 'status' in obj) {
            return obj.status;
        }
        return String(obj);
    }
}
/**
 * NumericRangeRule - Detects contradictions where numeric values differ significantly.
 */
class NumericRangeRule {
    id = 'numeric-range';
    name = 'Numeric Discrepancy';
    // Tolerance thresholds by predicate
    tolerances = new Map([
        ['hasFollowerCount', 0.1], // 10% tolerance
        ['detail:amount', 0.01], // 1% tolerance for financial amounts
        ['detail:count', 0.05], // 5% tolerance for counts
    ]);
    detect(claimA, claimB) {
        const tolerance = this.tolerances.get(claimA.predicate);
        if (tolerance === undefined) {
            return null;
        }
        const numA = this.extractNumber(claimA.object);
        const numB = this.extractNumber(claimB.object);
        if (numA === null || numB === null) {
            return null;
        }
        // Check if within tolerance
        const avg = (numA + numB) / 2;
        if (avg === 0) {
            if (numA !== numB) {
                return {
                    reason: `Numeric values ${numA} and ${numB} differ when one is zero`,
                    severity: 'medium',
                };
            }
            return null;
        }
        const percentDiff = Math.abs(numA - numB) / avg;
        if (percentDiff > tolerance) {
            return {
                reason: `Numeric values ${numA} and ${numB} differ by ${(percentDiff * 100).toFixed(1)}% (tolerance: ${(tolerance * 100).toFixed(1)}%)`,
                severity: percentDiff > tolerance * 3 ? 'high' : 'medium',
            };
        }
        return null;
    }
    extractNumber(obj) {
        if (typeof obj === 'number')
            return obj;
        if (typeof obj === 'string') {
            const parsed = parseFloat(obj);
            return isNaN(parsed) ? null : parsed;
        }
        return null;
    }
}
/**
 * StatusTransitionRule - Detects invalid status transitions over time.
 */
class StatusTransitionRule {
    id = 'status-transition';
    name = 'Invalid Status Transition';
    // Valid transitions: key can transition to values
    validTransitions = new Map([
        ['hasStatus', new Map([
                ['active', ['inactive', 'dissolved']],
                ['inactive', ['active', 'dissolved']],
                ['dissolved', []], // Cannot transition from dissolved
            ])],
    ]);
    detect(claimA, claimB) {
        const transitions = this.validTransitions.get(claimA.predicate);
        if (!transitions) {
            return null;
        }
        // Need temporal ordering to check transitions
        if (!claimA.validFrom || !claimB.validFrom) {
            return null;
        }
        const dateA = new Date(claimA.validFrom);
        const dateB = new Date(claimB.validFrom);
        const [earlier, later] = dateA < dateB
            ? [claimA, claimB]
            : [claimB, claimA];
        const earlierStatus = this.extractStatus(earlier.object);
        const laterStatus = this.extractStatus(later.object);
        if (!earlierStatus || !laterStatus || earlierStatus === laterStatus) {
            return null;
        }
        const allowedTransitions = transitions.get(earlierStatus);
        if (!allowedTransitions) {
            return null;
        }
        if (!allowedTransitions.includes(laterStatus)) {
            return {
                reason: `Invalid status transition from "${earlierStatus}" to "${laterStatus}"`,
                severity: 'high',
            };
        }
        return null;
    }
    extractStatus(obj) {
        if (typeof obj === 'string')
            return obj;
        return null;
    }
}
