/**
 * Summit Work Graph - Backlog Importer
 *
 * Imports backlog items from various sources into the graph.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { GraphStore } from '../store/neo4j.js';
import type { Epic, Ticket } from '../schema/nodes.js';
import { autoParseBacklog, parseTodoComments, type ParseResult, type ParsedItem } from './parsers.js';

export interface ImportOptions {
  autoTriage?: boolean;
  defaultPriority?: Ticket['priority'];
  defaultStatus?: Ticket['status'];
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
  items: Array<Epic | Ticket>;
}

export class BacklogImporter {
  constructor(private graphStore: GraphStore) {}

  /**
   * Import from a markdown file
   */
  importFile(filepath: string, options: ImportOptions = {}): Promise<ImportResult> {
    const content = fs.readFileSync(filepath, 'utf-8');
    const filename = path.basename(filepath);
    const parseResult = autoParseBacklog(content, filename);
    return this.processParseResult(parseResult, options);
  }

  /**
   * Import TODO comments from source files
   */
  importTodos(dirPath: string, options: ImportOptions = {}): Promise<ImportResult> {
    const allItems: ParsedItem[] = [];
    const errors: string[] = [];

    const scanDir = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'dist') {
            scanDir(fullPath);
          }
        } else if (entry.isFile() && /\.(ts|js|tsx|jsx|py|go|rs|java|c|cpp|h|hpp)$/.test(entry.name)) {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const result = parseTodoComments(content, fullPath);
            allItems.push(...result.items);
          } catch (e) {
            errors.push(`Failed to read ${fullPath}: ${e}`);
          }
        }
      }
    };

    scanDir(dirPath);

    return this.processParseResult({ items: allItems, format: 'todo-comments', errors }, options);
  }

  /**
   * Import all known backlog files from a project
   */
  async importAll(projectRoot: string, options: ImportOptions = {}): Promise<ImportResult> {
    const result: ImportResult = { imported: 0, skipped: 0, errors: [], items: [] };

    const knownBacklogs = [
      'ROADMAP.md',
      'BACKLOG.md',
      'TODO.md',
      'docs/ROADMAP.md',
      'docs/BACKLOG.md',
      'docs/sprint-backlog.md',
      'docs/mvp-backlog.md',
      '.github/ROADMAP.md',
    ];

    // Find all markdown files with backlog-like names
    const findBacklogs = (dir: string, depth = 0): string[] => {
      if (depth > 3) return [];
      const found: string[] = [];
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            found.push(...findBacklogs(fullPath, depth + 1));
          } else if (entry.isFile()) {
            const name = entry.name.toLowerCase();
            if (
              name.endsWith('.md') &&
              (name.includes('backlog') || name.includes('roadmap') || name.includes('sprint') || name.includes('todo'))
            ) {
              found.push(fullPath);
            }
          }
        }
      } catch {
        // Ignore errors accessing directories
      }
      return found;
    };

    // Import known backlogs
    for (const backlog of knownBacklogs) {
      const fullPath = path.join(projectRoot, backlog);
      if (fs.existsSync(fullPath)) {
        try {
          const fileResult = await this.importFile(fullPath, options);
          result.imported += fileResult.imported;
          result.skipped += fileResult.skipped;
          result.errors.push(...fileResult.errors);
          result.items.push(...fileResult.items);
        } catch (e) {
          result.errors.push(`Failed to import ${fullPath}: ${e}`);
        }
      }
    }

    // Find and import additional backlogs
    const additionalBacklogs = findBacklogs(projectRoot);
    for (const backlog of additionalBacklogs) {
      // Skip if already imported
      if (knownBacklogs.some((known) => backlog.endsWith(known))) continue;

      try {
        const fileResult = await this.importFile(backlog, options);
        result.imported += fileResult.imported;
        result.skipped += fileResult.skipped;
        result.errors.push(...fileResult.errors);
        result.items.push(...fileResult.items);
      } catch (e) {
        result.errors.push(`Failed to import ${backlog}: ${e}`);
      }
    }

    return result;
  }

  /**
   * Process parsed items into graph nodes
   */
  private async processParseResult(parseResult: ParseResult, options: ImportOptions): Promise<ImportResult> {
    const result: ImportResult = {
      imported: 0,
      skipped: 0,
      errors: [...parseResult.errors],
      items: [],
    };

    const epicMap = new Map<string, Epic>();

    for (const item of parseResult.items) {
      try {
        if (item.itemType === 'epic') {
          // Create epic node
          const epic: Epic = await this.graphStore.createNode({
            id: crypto.randomUUID(),
            type: 'epic',
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'importer',
            title: item.title,
            description: item.description || `Imported from ${item.source}`,
            status: 'planned',
            progress: 0,
          });
          epicMap.set(item.title, epic);
          result.items.push(epic);
          result.imported++;
        } else {
          // Auto-triage if enabled
          const triageResult = options.autoTriage ? this.autoTriage(item) : {};

          // Create ticket node
          const ticket: Ticket = await this.graphStore.createNode({
            id: crypto.randomUUID(),
            type: 'ticket',
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'importer',
            title: item.title,
            description: item.description || `Imported from ${item.source}`,
            status: (item.status as Ticket['status']) || options.defaultStatus || 'backlog',
            priority: (item.priority as Ticket['priority']) || options.defaultPriority || 'P2',
            ticketType: triageResult.ticketType || 'unknown',
            labels: item.labels || [],
            agentEligible: triageResult.agentEligible || false,
            complexity: triageResult.complexity || 'unknown',
            area: triageResult.area,
            estimate: item.estimate,
          });

          result.items.push(ticket);
          result.imported++;

          // Link to parent epic if exists
          const parentEpic = item.parent ? epicMap.get(item.parent) : undefined;
          if (parentEpic) {
            await this.graphStore.createEdge({
              id: crypto.randomUUID(),
              type: 'implements',
              sourceId: ticket.id,
              targetId: parentEpic.id,
              createdAt: new Date(),
              createdBy: 'importer',
              weight: 1,
            });
          }
        }
      } catch (e) {
        result.errors.push(`Failed to import "${item.title}": ${e}`);
        result.skipped++;
      }
    }

    return result;
  }

  /**
   * Auto-triage a parsed item
   */
  private autoTriage(item: ParsedItem): {
    ticketType?: Ticket['ticketType'];
    complexity?: Ticket['complexity'];
    agentEligible?: boolean;
    area?: string;
  } {
    const result: {
      ticketType?: Ticket['ticketType'];
      complexity?: Ticket['complexity'];
      agentEligible?: boolean;
      area?: string;
    } = {};

    const title = item.title.toLowerCase();

    // Determine ticket type
    if (title.includes('bug') || title.includes('fix') || title.includes('broken')) {
      result.ticketType = 'bug';
    } else if (title.includes('refactor') || title.includes('cleanup') || title.includes('technical debt')) {
      result.ticketType = 'chore';
    } else if (title.includes('test') || title.includes('coverage')) {
      result.ticketType = 'chore';
    } else if (title.includes('doc') || title.includes('readme')) {
      result.ticketType = 'chore';
    } else {
      result.ticketType = 'feature';
    }

    // Estimate complexity
    if (title.includes('simple') || title.includes('minor') || title.includes('small')) {
      result.complexity = 'simple';
      result.agentEligible = true;
    } else if (title.includes('complex') || title.includes('major') || title.includes('large')) {
      result.complexity = 'complex';
      result.agentEligible = false;
    } else {
      result.complexity = 'medium';
      result.agentEligible = true;
    }

    // Detect area
    if (title.includes('api') || title.includes('endpoint') || title.includes('rest') || title.includes('graphql')) {
      result.area = 'api';
    } else if (title.includes('ui') || title.includes('frontend') || title.includes('component') || title.includes('react')) {
      result.area = 'frontend';
    } else if (title.includes('database') || title.includes('db') || title.includes('query') || title.includes('schema')) {
      result.area = 'database';
    } else if (title.includes('security') || title.includes('auth') || title.includes('permission')) {
      result.area = 'security';
    } else if (title.includes('test') || title.includes('coverage')) {
      result.area = 'testing';
    } else if (title.includes('deploy') || title.includes('ci') || title.includes('pipeline')) {
      result.area = 'devops';
    }

    return result;
  }
}

/**
 * Import from raw content (for GraphQL mutation)
 */
export function importFromContent(
  graphStore: GraphStore,
  content: string,
  source: string,
  options: ImportOptions = {}
): Promise<ImportResult> {
  const importer = new BacklogImporter(graphStore);
  const parseResult = autoParseBacklog(content, source);
  return (importer as unknown as { processParseResult: (p: ParseResult, o: ImportOptions) => Promise<ImportResult> }).processParseResult(
    parseResult,
    options
  );
}
