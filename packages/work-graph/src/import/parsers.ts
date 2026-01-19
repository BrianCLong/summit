/**
 * Summit Work Graph - Backlog Parsers
 *
 * Utilities for parsing various backlog formats (markdown, TODO comments, etc.)
 */

export interface ParsedItem {
  title: string;
  description?: string;
  priority?: string;
  status?: string;
  labels?: string[];
  estimate?: number;
  parent?: string;
  itemType: 'epic' | 'ticket';
  source: string;
  lineNumber?: number;
}

export interface ParseResult {
  items: ParsedItem[];
  format: string;
  errors: string[];
}

/**
 * Parse numbered task list (e.g., "1. Task name")
 */
export function parseNumberedTasks(content: string, source: string): ParseResult {
  const items: ParsedItem[] = [];
  const errors: string[] = [];
  const lines = content.split('\n');

  let currentEpic: string | undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check for epic headers (## or ###)
    const epicMatch = line.match(/^#{2,3}\s+(.+)$/);
    if (epicMatch) {
      currentEpic = epicMatch[1];
      items.push({
        title: currentEpic,
        itemType: 'epic',
        source,
        lineNumber: i + 1,
      });
      continue;
    }

    // Check for numbered tasks
    const taskMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (taskMatch) {
      const title = taskMatch[2];
      const priority = extractPriority(title);
      items.push({
        title: cleanTitle(title),
        priority,
        itemType: 'ticket',
        parent: currentEpic,
        source,
        lineNumber: i + 1,
      });
    }

    // Check for bullet tasks
    const bulletMatch = line.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      const title = bulletMatch[1];
      const priority = extractPriority(title);
      items.push({
        title: cleanTitle(title),
        priority,
        itemType: 'ticket',
        parent: currentEpic,
        source,
        lineNumber: i + 1,
      });
    }
  }

  return { items, format: 'numbered-tasks', errors };
}

/**
 * Parse sprint backlog format (Sprint > Epic > Tickets)
 */
export function parseSprintBacklog(content: string, source: string): ParseResult {
  const items: ParsedItem[] = [];
  const errors: string[] = [];
  const lines = content.split('\n');

  let currentSprint: string | undefined;
  let currentEpic: string | undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Sprint header
    const sprintMatch = line.match(/^#\s+Sprint\s+(\d+)[:.]?\s*(.*)$/i);
    if (sprintMatch) {
      currentSprint = `Sprint ${sprintMatch[1]}`;
      continue;
    }

    // Epic header
    const epicMatch = line.match(/^#{2,3}\s+(.+)$/);
    if (epicMatch) {
      currentEpic = epicMatch[1];
      items.push({
        title: currentEpic,
        itemType: 'epic',
        source,
        lineNumber: i + 1,
        labels: currentSprint ? [currentSprint.toLowerCase().replace(/\s+/g, '-')] : [],
      });
      continue;
    }

    // Ticket line
    const ticketMatch = line.match(/^[-*]\s+\[([x\s])\]\s+(.+)$/i);
    if (ticketMatch) {
      const done = ticketMatch[1].toLowerCase() === 'x';
      const title = ticketMatch[2];
      items.push({
        title: cleanTitle(title),
        status: done ? 'done' : 'backlog',
        priority: extractPriority(title),
        itemType: 'ticket',
        parent: currentEpic,
        source,
        lineNumber: i + 1,
      });
    }
  }

  return { items, format: 'sprint-backlog', errors };
}

/**
 * Parse GitHub issues format
 */
export function parseGitHubIssues(content: string, source: string): ParseResult {
  const items: ParsedItem[] = [];
  const errors: string[] = [];

  // Simple JSON array of issues
  try {
    const issues = JSON.parse(content) as Array<{
      title: string;
      body?: string;
      labels?: Array<{ name: string }>;
      state: string;
      number: number;
    }>;
    for (const issue of issues) {
      items.push({
        title: issue.title,
        description: issue.body,
        status: issue.state === 'open' ? 'backlog' : 'done',
        labels: issue.labels?.map((l) => l.name),
        itemType: 'ticket',
        source: `${source}#${issue.number}`,
      });
    }
  } catch {
    errors.push('Failed to parse GitHub issues JSON');
  }

  return { items, format: 'github-issues', errors };
}

/**
 * Parse TODO comments from source code
 */
export function parseTodoComments(content: string, filePath: string): ParseResult {
  const items: ParsedItem[] = [];
  const errors: string[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const todoMatch = line.match(/\/\/\s*TODO[:\s]+(.+)$/i) || line.match(/#\s*TODO[:\s]+(.+)$/i);
    if (todoMatch) {
      items.push({
        title: todoMatch[1].trim(),
        itemType: 'ticket',
        source: filePath,
        lineNumber: i + 1,
        labels: ['todo', 'code-debt'],
      });
    }
  }

  return { items, format: 'todo-comments', errors };
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

    // Table header
    if (line.startsWith('|') && line.includes('|') && !inTable) {
      headers = line
        .split('|')
        .map((h) => h.trim().toLowerCase())
        .filter((h) => h);
      inTable = true;
      continue;
    }

    // Skip separator row
    if (line.match(/^\|[-:\s|]+\|$/)) {
      continue;
    }

    // Table row
    if (inTable && line.startsWith('|')) {
      const cells = line
        .split('|')
        .map((c) => c.trim())
        .filter((c) => c);

      const titleIdx = headers.findIndex((h) => h.includes('title') || h.includes('task') || h.includes('name'));
      const priorityIdx = headers.findIndex((h) => h.includes('priority'));
      const statusIdx = headers.findIndex((h) => h.includes('status'));

      if (titleIdx >= 0 && cells[titleIdx]) {
        items.push({
          title: cells[titleIdx],
          priority: priorityIdx >= 0 ? cells[priorityIdx] : undefined,
          status: statusIdx >= 0 ? cells[statusIdx]?.toLowerCase() : undefined,
          itemType: 'ticket',
          source,
          lineNumber: i + 1,
        });
      }
    }
  }

  return { items, format: 'markdown-table', errors };
}

/**
 * Auto-detect and parse backlog format
 */
export function autoParseBacklog(content: string, source: string): ParseResult {
  // Try to detect format
  if (content.includes('Sprint') && content.includes('##')) {
    return parseSprintBacklog(content, source);
  }

  if (content.startsWith('[') && content.includes('"title"')) {
    return parseGitHubIssues(content, source);
  }

  if (content.includes('|') && content.includes('---')) {
    const tableResult = parseMarkdownTable(content, source);
    if (tableResult.items.length > 0) {
      return tableResult;
    }
  }

  // Default to numbered tasks
  return parseNumberedTasks(content, source);
}

// Helper functions
function extractPriority(title: string): string | undefined {
  const match = title.match(/\[P([0-3])\]/i);
  return match ? `P${match[1]}` : undefined;
}

function cleanTitle(title: string): string {
  return title.replace(/\[P[0-3]\]/gi, '').replace(/\[.*?\]/g, '').trim();
}
