/**
 * Summit Work Graph - Markdown Parsers
 *
 * Utilities for parsing backlog items from various markdown formats.
 */

export interface ParsedItem {
  title: string;
  description: string;
  itemType: 'epic' | 'ticket';
  priority?: 'P0' | 'P1' | 'P2' | 'P3';
  labels?: string[];
  parent?: string;
  estimate?: number;
  status?: string;
  assignee?: string;
  dueDate?: Date;
  source: string;
  sourceFile?: string;
  lineNumber?: number;
}

export interface ParseResult {
  items: ParsedItem[];
  errors: string[];
  source: string;
}

/**
 * Parse numbered task lists (1. Task, 2. Task, etc.)
 */
export function parseNumberedTasks(content: string, source: string): ParseResult {
  const items: ParsedItem[] = [];
  const errors: string[] = [];
  const lines = content.split('\n');

  const taskRegex = /^\s*(\d+)\.\s+(.+)$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(taskRegex);
    if (match) {
      const [, , title] = match;
      items.push({
        title: title.trim(),
        description: '',
        itemType: 'ticket',
        source,
        lineNumber: i + 1,
      });
    }
  }

  return { items, errors, source };
}

/**
 * Parse sprint backlog format with hierarchy (Sprint > Epic > Ticket)
 */
export function parseSprintBacklog(content: string, source: string): ParseResult {
  const items: ParsedItem[] = [];
  const errors: string[] = [];
  const lines = content.split('\n');

  let currentSprint: string | undefined;
  let currentEpic: string | undefined;

  const sprintHeaderRegex = /^##\s+Sprint\s+(\d+):\s*(.+)$/i;
  const epicHeaderRegex = /^###\s+(.+)$/;
  const ticketRegex = /^[-*]\s+\[([x\s])\]\s+(.+)$/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for sprint header
    const sprintMatch = line.match(sprintHeaderRegex);
    if (sprintMatch) {
      currentSprint = `Sprint ${sprintMatch[1]}: ${sprintMatch[2]}`;
      continue;
    }

    // Check for epic header
    const epicMatch = line.match(epicHeaderRegex);
    if (epicMatch) {
      currentEpic = epicMatch[1].trim();
      items.push({
        title: currentEpic,
        description: `Epic from ${currentSprint || source}`,
        itemType: 'epic',
        source,
        lineNumber: i + 1,
        labels: currentSprint ? [currentSprint] : [],
      });
      continue;
    }

    // Check for ticket
    const ticketMatch = line.match(ticketRegex);
    if (ticketMatch) {
      const [, checkbox, title] = ticketMatch;
      const isDone = checkbox.toLowerCase() === 'x';
      items.push({
        title: title.trim(),
        description: '',
        itemType: 'ticket',
        status: isDone ? 'done' : 'backlog',
        parent: currentEpic,
        source,
        lineNumber: i + 1,
        labels: currentSprint ? [currentSprint] : [],
      });
    }
  }

  return { items, errors, source };
}

/**
 * Parse GitHub issue format (# Issue Title with labels)
 */
export function parseGitHubIssues(content: string, source: string): ParseResult {
  const items: ParsedItem[] = [];
  const errors: string[] = [];
  const lines = content.split('\n');

  const issueHeaderRegex = /^#\s+(.+)$/;
  const labelRegex = /\[([^\]]+)\]/g;

  let currentTitle: string | undefined;
  let currentLabels: string[] = [];
  let descriptionLines: string[] = [];

  const flushCurrentIssue = (lineNum: number) => {
    if (currentTitle) {
      items.push({
        title: currentTitle,
        description: descriptionLines.join('\n').trim(),
        itemType: 'ticket',
        labels: currentLabels,
        source,
        lineNumber: lineNum,
      });
    }
    currentTitle = undefined;
    currentLabels = [];
    descriptionLines = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const headerMatch = line.match(issueHeaderRegex);
    if (headerMatch) {
      flushCurrentIssue(i);
      currentTitle = headerMatch[1].trim();

      // Extract labels from title
      const labels = [...currentTitle.matchAll(labelRegex)].map((m) => m[1]);
      currentLabels = labels;

      // Remove labels from title
      currentTitle = currentTitle.replace(labelRegex, '').trim();
    } else if (currentTitle) {
      descriptionLines.push(line);
    }
  }

  flushCurrentIssue(lines.length);

  return { items, errors, source };
}

/**
 * Parse TODO comments from source code
 */
export function parseTodoComments(content: string, source: string): ParseResult {
  const items: ParsedItem[] = [];
  const errors: string[] = [];
  const lines = content.split('\n');

  // Matches various TODO formats:
  // // TODO: message
  // // TODO(assignee): message
  // // FIXME: message
  // # TODO: message (for Python/Shell)
  const todoRegex = /(?:\/\/|#|\/\*|\*)\s*(TODO|FIXME|HACK|XXX)(?:\(([^)]+)\))?:\s*(.+?)(?:\*\/)?$/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(todoRegex);
    if (match) {
      const [, type, assignee, message] = match;
      items.push({
        title: message.trim(),
        description: `${type.toUpperCase()} found at line ${i + 1}`,
        itemType: 'ticket',
        assignee: assignee?.trim(),
        labels: [type.toLowerCase(), 'code-todo'],
        source,
        sourceFile: source,
        lineNumber: i + 1,
        priority: type.toUpperCase() === 'FIXME' ? 'P2' : 'P3',
      });
    }
  }

  return { items, errors, source };
}

/**
 * Parse markdown table format
 */
export function parseMarkdownTable(content: string, source: string): ParseResult {
  const items: ParsedItem[] = [];
  const errors: string[] = [];
  const lines = content.split('\n');

  let headers: string[] = [];
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detect table header
    if (line.startsWith('|') && line.endsWith('|') && !inTable) {
      headers = line
        .slice(1, -1)
        .split('|')
        .map((h) => h.trim().toLowerCase());
      inTable = true;
      continue;
    }

    // Skip separator line
    if (inTable && /^\|[\s-:|]+\|$/.test(line)) {
      continue;
    }

    // Parse table row
    if (inTable && line.startsWith('|') && line.endsWith('|')) {
      const cells = line
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim());

      const item: ParsedItem = {
        title: '',
        description: '',
        itemType: 'ticket',
        source,
        lineNumber: i + 1,
      };

      for (let j = 0; j < headers.length && j < cells.length; j++) {
        const header = headers[j];
        const value = cells[j];

        if (header.includes('title') || header.includes('task') || header.includes('name')) {
          item.title = value;
        } else if (header.includes('description') || header.includes('desc')) {
          item.description = value;
        } else if (header.includes('priority')) {
          const p = value.toUpperCase();
          if (['P0', 'P1', 'P2', 'P3'].includes(p)) {
            item.priority = p as 'P0' | 'P1' | 'P2' | 'P3';
          }
        } else if (header.includes('status')) {
          item.status = value.toLowerCase();
        } else if (header.includes('assignee') || header.includes('owner')) {
          item.assignee = value;
        } else if (header.includes('estimate') || header.includes('points')) {
          const num = parseInt(value, 10);
          if (!isNaN(num)) {
            item.estimate = num;
          }
        } else if (header.includes('label') || header.includes('tag')) {
          item.labels = value.split(',').map((l) => l.trim());
        }
      }

      if (item.title) {
        items.push(item);
      }
    } else if (inTable && !line.startsWith('|')) {
      // End of table
      inTable = false;
      headers = [];
    }
  }

  return { items, errors, source };
}

/**
 * Auto-detect format and parse
 */
export function autoParseBacklog(content: string, source: string): ParseResult {
  // Check for sprint backlog format
  if (/^##\s+Sprint\s+\d+/im.test(content)) {
    return parseSprintBacklog(content, source);
  }

  // Check for markdown table
  if (/^\|.+\|[\r\n]+\|[\s-:|]+\|/m.test(content)) {
    return parseMarkdownTable(content, source);
  }

  // Check for numbered list
  if (/^\s*\d+\.\s+/m.test(content)) {
    return parseNumberedTasks(content, source);
  }

  // Check for TODO comments (source code)
  if (/(?:\/\/|#)\s*(?:TODO|FIXME):/i.test(content)) {
    return parseTodoComments(content, source);
  }

  // Default: try GitHub issues format
  return parseGitHubIssues(content, source);
}
