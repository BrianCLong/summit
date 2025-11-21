/**
 * Backlog Parser
 *
 * Parses structured backlog.json files containing epics and stories.
 * Handles validation, error recovery, and malformed data gracefully.
 *
 * @module data/backlog-parser
 */
import { TriageItem } from '../types.js';
/**
 * Validation error details
 */
interface ValidationError {
    type: 'missing_field' | 'invalid_format' | 'empty_array';
    message: string;
    context?: string;
}
/**
 * Parse result with errors and warnings
 */
export interface ParseResult {
    items: TriageItem[];
    errors: ValidationError[];
    warnings: string[];
    stats: {
        totalEpics: number;
        totalStories: number;
        skipped: number;
    };
}
/**
 * Parses backlog.json file and converts to triage items
 *
 * Features:
 * - Validates JSON structure before parsing
 * - Handles missing or malformed fields gracefully
 * - Collects validation errors and warnings
 * - Provides detailed statistics
 *
 * @param backlogPath - Optional path to backlog.json (defaults to backlog/backlog.json)
 * @returns Promise resolving to ParseResult with items, errors, and stats
 *
 * @example
 * ```typescript
 * const result = await parseBacklog();
 * console.log(`Parsed ${result.items.length} items with ${result.errors.length} errors`);
 * ```
 */
export declare function parseBacklog(backlogPath?: string): Promise<TriageItem[]>;
/**
 * Parses backlog with detailed error reporting
 *
 * @param backlogPath - Optional path to backlog.json
 * @returns Promise resolving to ParseResult with full details
 */
export declare function parseBacklogWithDetails(backlogPath?: string): Promise<ParseResult>;
export {};
//# sourceMappingURL=backlog-parser.d.ts.map