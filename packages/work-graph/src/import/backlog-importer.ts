/**
 * Summit Work Graph - Backlog Importer
 *
 * Imports work items from various sources into the work graph.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { GraphStore } from '../store/neo4j.js';
import type { Ticket, Epic } from '../schema/nodes.js';
import { autoParseBacklog, parseTodoComments, type ParseResult, type ParsedItem } from './parsers.js';

export interface ImportOptions {
  dryRun?: boolean;
  autoTriage?: boolean;
  defaultPriority?: 'P0' | 'P1' | 'P2' | 'P3';
  defaultLabels?: string[];
  boardId?: string;
  sprintId?: string;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
  items: Array<{ id: string; title: string; type: 'epic' | 'ticket' }>;
}

/**
 * Simple auto-triage based on title/description keywords
 */
function autoTriageItem(item: ParsedItem): Partial<ParsedItem> {
  const title = item.title.toLowerCase();
  const desc = (item.description || '').toLowerCase();
  const combined = `${title} ${desc}`;

  const result: Partial<ParsedItem> = {};

  // Determine ticket type based on keywords
  if (/\b(bug|fix|broken|error|crash|fail)\b/.test(combined)) {
    result.labels = [...(item.labels || []), 'bug'];
  } else if (/\b(refactor|clean|improve|optimize)\b/.test(combined)) {
    result.labels = [...(item.labels || []), 'refactor'];
  } else if (/\b(test|spec|coverage)\b/.test(combined)) {
    result.labels = [...(item.labels || []), 'test'];
  } else if (/\b(doc|readme|comment)\b/.test(combined)) {
    result.labels = [...(item.labels || []), 'docs'];
  } else {
    result.labels = [...(item.labels || []), 'feature'];
  }

  // Determine priority based on keywords
  if (!item.priority) {
    if (/\b(critical|urgent|blocker|p0|asap)\b/.test(combined)) {
      result.priority = 'P0';
    } else if (/\b(high|important|p1)\b/.test(combined)) {
      result.priority = 'P1';
    } else if (/\b(medium|normal|p2)\b/.test(combined)) {
      result.priority = 'P2';
    } else {
      result.priority = 'P3';
    }
  }

  return result;
}

/**
 * Determine complexity based on title/description
 */
function estimateComplexity(item: ParsedItem): 'trivial' | 'simple' | 'medium' | 'complex' | 'unknown' {
  const title = item.title.toLowerCase();
  const desc = (item.description || '').toLowerCase();
  const combined = `${title} ${desc}`;

  if (/\b(simple|easy|trivial|typo|rename)\b/.test(combined)) {
    return 'trivial';
  }
  if (/\b(add|create|implement basic|straightforward)\b/.test(combined)) {
    return 'simple';
  }
  if (/\b(refactor|integrate|migrate|complex|architecture)\b/.test(combined)) {
    return 'complex';
  }
  if (item.estimate && item.estimate >= 8) {
    return 'complex';
  }
  if (item.estimate && item.estimate <= 2) {
    return 'simple';
  }

  return 'medium';
}

/**
 * Check if ticket is agent-eligible based on characteristics
 */
function isAgentEligible(item: ParsedItem): boolean {
  const title = item.title.toLowerCase();
  const desc = (item.description || '').toLowerCase();
  const combined = `${title} ${desc}`;

  // Not eligible for complex coordination or ambiguous tasks
  if (/\b(discuss|decide|review|meeting|design)\b/.test(combined)) {
    return false;
  }

  // Good candidates
  if (/\b(test|fix|add|implement|create|update|refactor)\b/.test(combined)) {
    return true;
  }

  // Default: simple/medium complexity is eligible
  const complexity = estimateComplexity(item);
  return complexity === 'trivial' || complexity === 'simple' || complexity === 'medium';
}

export class BacklogImporter {
  constructor(private graphStore: GraphStore) {}

  /**
   * Import from a markdown file
   */
  async importFile(filePath: string, options: ImportOptions = {}): Promise<ImportResult> {
    const content = await fs.readFile(filePath, 'utf-8');
    const fileName = path.basename(filePath);
    const parseResult = autoParseBacklog(content, fileName);

    return this.processParseResult(parseResult, options);
  }

  /**
   * Import TODO comments from source code
   */
  async importTodos(dirPath: string, options: ImportOptions = {}): Promise<ImportResult> {
    const allItems: ParsedItem[] = [];
    const errors: string[] = [];

    const scanDir = async (dir: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // Skip node_modules, .git, etc.
          if (!['node_modules', '.git', 'dist', 'build', 'coverage'].includes(entry.name)) {
            await scanDir(fullPath);
          }
        } else if (entry.isFile()) {
          // Check for source files
          if (/\.(ts|tsx|js|jsx|py|go|rs|java|c|cpp|h|hpp)$/.test(entry.name)) {
            try {
              const content = await fs.readFile(fullPath, 'utf-8');
              const result = parseTodoComments(content, fullPath);
              allItems.push(...result.items);
              errors.push(...result.errors);
            } catch {
              errors.push(`Failed to read ${fullPath}`);
            }
          }
        }
      }
    };

    await scanDir(dirPath);

    return this.processParseResult(
      {
        items: allItems,
        errors,
        source: dirPath,
      },
      options
    );
  }

  /**
   * Import all known backlog files
   */
  async importAll(basePath: string, options: ImportOptions = {}): Promise<ImportResult> {
    const knownFiles = [
      'ROADMAP.md',
      'MVP-4-GA-SPRINT-BACKLOG.md',
      '90_DAY_WAR_ROOM_BACKLOG.md',
      'merge-priority-plan.md',
      'docs/backlog.md',
    ];

    const allItems: ParsedItem[] = [];
    const errors: string[] = [];

    for (const file of knownFiles) {
      const fullPath = path.join(basePath, file);
      try {
        const stat = await fs.stat(fullPath);
        if (stat.isFile()) {
          const content = await fs.readFile(fullPath, 'utf-8');
          const result = autoParseBacklog(content, file);
          allItems.push(...result.items);
          errors.push(...result.errors);
        }
      } catch {
        // File doesn't exist, skip
      }
    }

    return this.processParseResult(
      {
        items: allItems,
        errors,
        source: basePath,
      },
      options
    );
  }

  /**
   * Process parsed items and create graph nodes
   */
  private async processParseResult(result: ParseResult, options: ImportOptions): Promise<ImportResult> {
    const importResult: ImportResult = {
      imported: 0,
      skipped: 0,
      errors: [...result.errors],
      items: [],
    };

    // Track created epics for linking
    const epicMap = new Map<string, string>();

    // First pass: create epics
    for (const item of result.items) {
      if (item.itemType !== 'epic') continue;

      if (options.dryRun) {
        importResult.items.push({ id: 'dry-run', title: item.title, type: 'epic' });
        importResult.imported++;
        epicMap.set(item.title, 'dry-run');
        continue;
      }

      try {
        const epic = await this.graphStore.createNode<Epic>({
          id: crypto.randomUUID(),
          type: 'epic',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'backlog-importer',
          title: item.title,
          description: item.description || `Imported from ${item.source}`,
          status: 'planned',
          progress: 0,
        });

        epicMap.set(item.title, epic.id);
        importResult.items.push({ id: epic.id, title: epic.title, type: 'epic' });
        importResult.imported++;
      } catch (error) {
        importResult.errors.push(`Failed to create epic "${item.title}": ${error}`);
        importResult.skipped++;
      }
    }

    // Second pass: create tickets
    for (const item of result.items) {
      if (item.itemType !== 'ticket') continue;

      // Apply auto-triage if enabled
      let triaged = item;
      if (options.autoTriage !== false) {
        const triageResult = autoTriageItem(item);
        triaged = { ...item, ...triageResult };
      }

      const complexity = estimateComplexity(triaged);
      const agentEligible = isAgentEligible(triaged);

      if (options.dryRun) {
        importResult.items.push({ id: 'dry-run', title: item.title, type: 'ticket' });
        importResult.imported++;
        continue;
      }

      try {
        const ticket = await this.graphStore.createNode<Ticket>({
          id: crypto.randomUUID(),
          type: 'ticket',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'backlog-importer',
          title: triaged.title,
          description: triaged.description || `Imported from ${triaged.source}`,
          status: (triaged.status as Ticket['status']) || 'backlog',
          priority: triaged.priority || options.defaultPriority || 'P3',
          ticketType: 'unknown',
          labels: [...(triaged.labels || []), ...(options.defaultLabels || [])],
          estimate: triaged.estimate,
          assignee: triaged.assignee,
          agentEligible,
          complexity,
          sprintId: options.sprintId,
        });

        // Link to parent epic if exists
        if (triaged.parent && epicMap.has(triaged.parent)) {
          await this.graphStore.createEdge({
            id: crypto.randomUUID(),
            type: 'implements',
            sourceId: ticket.id,
            targetId: epicMap.get(triaged.parent)!,
            createdAt: new Date(),
            createdBy: 'backlog-importer',
            weight: 1,
          });
        }

        importResult.items.push({ id: ticket.id, title: ticket.title, type: 'ticket' });
        importResult.imported++;
      } catch (error) {
        importResult.errors.push(`Failed to create ticket "${item.title}": ${error}`);
        importResult.skipped++;
      }
    }

    return importResult;
  }
}
