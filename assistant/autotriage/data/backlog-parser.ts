/**
 * Backlog Parser
 *
 * Parses structured backlog.json files containing epics and stories.
 * Handles validation, error recovery, and malformed data gracefully.
 *
 * @module data/backlog-parser
 */

import * as fs from 'fs';
import * as path from 'path';
import { TriageItem } from '../types.js';

/**
 * Represents a story within an epic
 */
interface BacklogStory {
  id: string;
  title: string;
  owner?: string;
  depends_on?: string[];
  acceptance_criteria?: string[];
  verification?: any[];
  evidence_hooks?: any[];
}

/**
 * Represents an epic containing multiple stories
 */
interface BacklogEpic {
  id: string;
  title: string;
  priority: string;
  stories: BacklogStory[];
}

/**
 * Top-level backlog structure
 */
interface Backlog {
  version: string;
  epics: BacklogEpic[];
}

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
export async function parseBacklog(backlogPath?: string): Promise<TriageItem[]> {
  const result = await parseBacklogWithDetails(backlogPath);

  // Log warnings if any
  if (result.warnings.length > 0) {
    console.warn(`⚠️  Backlog parsing warnings: ${result.warnings.length}`);
    result.warnings.forEach(w => console.warn(`   - ${w}`));
  }

  // Log errors if any
  if (result.errors.length > 0) {
    console.warn(`❌ Backlog parsing errors: ${result.errors.length}`);
    result.errors.forEach(e => console.warn(`   - ${e.message}`));
  }

  return result.items;
}

/**
 * Parses backlog with detailed error reporting
 *
 * @param backlogPath - Optional path to backlog.json
 * @returns Promise resolving to ParseResult with full details
 */
export async function parseBacklogWithDetails(backlogPath?: string): Promise<ParseResult> {
  const result: ParseResult = {
    items: [],
    errors: [],
    warnings: [],
    stats: {
      totalEpics: 0,
      totalStories: 0,
      skipped: 0,
    },
  };

  // Determine file path with fallback to default location
  const filePath = backlogPath || path.join(process.cwd(), 'backlog', 'backlog.json');

  // Check if file exists before attempting to read
  if (!fs.existsSync(filePath)) {
    result.warnings.push(`Backlog file not found: ${filePath}`);
    return result;
  }

  try {
    // Read file content with explicit encoding
    const content = fs.readFileSync(filePath, 'utf8');

    // Validate that content is not empty
    if (!content || content.trim().length === 0) {
      result.errors.push({
        type: 'invalid_format',
        message: 'Backlog file is empty',
        context: filePath,
      });
      return result;
    }

    // Parse JSON with error handling
    let backlog: Backlog;
    try {
      backlog = JSON.parse(content);
    } catch (parseError: any) {
      result.errors.push({
        type: 'invalid_format',
        message: `Invalid JSON format: ${parseError.message}`,
        context: filePath,
      });
      return result;
    }

    // Validate backlog structure
    const structureError = validateBacklogStructure(backlog);
    if (structureError) {
      result.errors.push(structureError);
      return result;
    }

    // Process each epic
    result.stats.totalEpics = backlog.epics.length;

    for (const epic of backlog.epics) {
      // Validate epic has required fields
      if (!epic.id || !epic.title) {
        result.errors.push({
          type: 'missing_field',
          message: `Epic missing required fields (id or title)`,
          context: epic.id || 'unknown',
        });
        result.stats.skipped += epic.stories?.length || 0;
        continue;
      }

      // Validate stories array exists
      if (!epic.stories || !Array.isArray(epic.stories)) {
        result.warnings.push(`Epic ${epic.id} has no stories array`);
        continue;
      }

      result.stats.totalStories += epic.stories.length;

      // Process each story in the epic
      for (const story of epic.stories) {
        try {
          // Validate story has required fields
          if (!story.id || !story.title) {
            result.errors.push({
              type: 'missing_field',
              message: `Story missing required fields (id or title)`,
              context: `Epic: ${epic.id}, Story: ${story.id || 'unknown'}`,
            });
            result.stats.skipped++;
            continue;
          }

          // Build detailed description from available fields
          const descriptionParts: string[] = [];

          // Include epic context for traceability
          descriptionParts.push(`Epic: ${epic.title}`);

          // Add acceptance criteria if present
          if (story.acceptance_criteria && Array.isArray(story.acceptance_criteria)) {
            const criteria = story.acceptance_criteria
              .filter(c => typeof c === 'string' && c.trim().length > 0)
              .join('\n');
            if (criteria) {
              descriptionParts.push(`Acceptance Criteria:\n${criteria}`);
            }
          }

          const description = descriptionParts.filter(Boolean).join('\n\n');

          // Calculate complexity score for prioritization
          const complexityScore = calculateStoryComplexity(story);

          // Create triage item with validated data
          const item: TriageItem = {
            id: sanitizeId(story.id),
            title: sanitizeTitle(story.title),
            description,
            source: 'backlog',
            sourceId: story.id,
            area: [], // Will be populated by classifier
            impact: mapPriorityToImpact(epic.priority),
            type: 'feature', // Backlog items default to features
            owner: sanitizeOwner(story.owner),
            status: 'planned',
            priority: epic.priority,
            impactScore: 0, // Will be calculated by impact analyzer
            complexityScore,
            isGoodFirstIssue: false, // Will be determined by classifier
            raw: { epic, story }, // Preserve original data for debugging
          };

          result.items.push(item);
        } catch (storyError: any) {
          // Catch any unexpected errors processing individual stories
          result.errors.push({
            type: 'invalid_format',
            message: `Error processing story: ${storyError.message}`,
            context: `Epic: ${epic.id}, Story: ${story.id || 'unknown'}`,
          });
          result.stats.skipped++;
        }
      }
    }
  } catch (error: any) {
    // Catch any unexpected file system or processing errors
    result.errors.push({
      type: 'invalid_format',
      message: `Unexpected error parsing backlog: ${error.message}`,
      context: filePath,
    });
  }

  return result;
}

/**
 * Validates the top-level backlog structure
 *
 * @param backlog - Parsed backlog object
 * @returns ValidationError if structure is invalid, undefined otherwise
 */
function validateBacklogStructure(backlog: any): ValidationError | undefined {
  if (!backlog || typeof backlog !== 'object') {
    return {
      type: 'invalid_format',
      message: 'Backlog is not a valid object',
    };
  }

  if (!backlog.epics || !Array.isArray(backlog.epics)) {
    return {
      type: 'missing_field',
      message: 'Backlog missing "epics" array',
    };
  }

  if (backlog.epics.length === 0) {
    return {
      type: 'empty_array',
      message: 'Backlog has no epics',
    };
  }

  return undefined;
}

/**
 * Maps backlog priority to impact level
 *
 * Priority mapping:
 * - "Must" or "P0" → blocker (highest urgency)
 * - "Should" or "P1" → high
 * - "Could" or "P2" → medium
 * - Others → low
 *
 * @param priority - Priority string from backlog
 * @returns Normalized impact level
 */
function mapPriorityToImpact(priority: string): 'blocker' | 'high' | 'medium' | 'low' {
  if (!priority || typeof priority !== 'string') {
    return 'low'; // Default for missing/invalid priority
  }

  const p = priority.toLowerCase().trim();

  // Blocker/Critical priority
  if (p.includes('must') || p.includes('p0') || p.includes('critical')) {
    return 'blocker';
  }

  // High priority
  if (p.includes('should') || p.includes('p1') || p.includes('high')) {
    return 'high';
  }

  // Medium priority
  if (p.includes('could') || p.includes('p2') || p.includes('medium')) {
    return 'medium';
  }

  // Default to low priority
  return 'low';
}

/**
 * Calculates story complexity based on multiple factors
 *
 * Complexity factors:
 * - Base complexity: 10 points
 * - Dependencies: +15 points per dependency
 * - Acceptance criteria: +5 points per criterion
 * - Evidence hooks: +10 points per hook
 *
 * Lower scores indicate simpler stories suitable for new contributors.
 *
 * @param story - Story object to analyze
 * @returns Complexity score (0-100+)
 */
function calculateStoryComplexity(story: BacklogStory): number {
  let score = 10; // Base complexity for any story

  // Dependencies increase complexity significantly
  // Stories with dependencies require coordination and understanding of related work
  if (story.depends_on && Array.isArray(story.depends_on)) {
    score += story.depends_on.length * 15;
  }

  // More acceptance criteria usually means more complex requirements
  if (story.acceptance_criteria && Array.isArray(story.acceptance_criteria)) {
    score += story.acceptance_criteria.length * 5;
  }

  // Evidence hooks indicate observability/measurement requirements
  if (story.evidence_hooks && Array.isArray(story.evidence_hooks)) {
    score += story.evidence_hooks.length * 10;
  }

  // Cap complexity at reasonable maximum
  return Math.min(score, 200);
}

/**
 * Sanitizes story ID for consistent formatting
 *
 * @param id - Raw ID from backlog
 * @returns Sanitized ID string
 */
function sanitizeId(id: string): string {
  if (!id || typeof id !== 'string') {
    return `backlog-${Date.now()}`; // Generate fallback ID
  }
  return id.trim();
}

/**
 * Sanitizes story title, handling edge cases
 *
 * @param title - Raw title from backlog
 * @returns Sanitized title string
 */
function sanitizeTitle(title: string): string {
  if (!title || typeof title !== 'string') {
    return 'Untitled Story';
  }

  // Trim and collapse whitespace
  return title.trim().replace(/\s+/g, ' ');
}

/**
 * Sanitizes owner field
 *
 * @param owner - Raw owner from backlog
 * @returns Sanitized owner string or undefined
 */
function sanitizeOwner(owner?: string): string | undefined {
  if (!owner || typeof owner !== 'string') {
    return undefined;
  }

  const sanitized = owner.trim();
  return sanitized.length > 0 ? sanitized : undefined;
}
