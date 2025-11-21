/**
 * Type classifier
 * Classifies issue type (bug/tech-debt/feature/enhancement)
 */
import { TriageItem } from '../types.js';
import { TypeRule } from '../config.js';
export declare function classifyType(item: TriageItem, typeRules: TypeRule[]): 'bug' | 'tech-debt' | 'feature' | 'enhancement';
//# sourceMappingURL=type-classifier.d.ts.map