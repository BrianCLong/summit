/**
 * Impact analyzer
 * Analyzes the impact level of an issue (blocker/high/medium/low)
 */
import { TriageItem } from '../types.js';
import { ImpactRule } from '../config.js';
export declare function analyzeImpact(item: TriageItem, impactRules: ImpactRule[]): {
    impact: 'blocker' | 'high' | 'medium' | 'low';
    score: number;
};
//# sourceMappingURL=impact-analyzer.d.ts.map