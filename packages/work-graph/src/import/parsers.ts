/**
 * Summit Work Graph - Markdown Parsers
 *
 * Parse various markdown backlog formats into work graph nodes.
 */

import type { Epic, Ticket } from '../schema/nodes.js';

// ============================================
// Types
// ============================================

export interface ParsedEpic {
  id: string;
  title: string;
  description: string;
  horizon: string;
  epicType: 'FOUNDATION' | 'DIFFERENTIATOR' | 'EXPERIMENT';
  dependencies: string[];
  stories: ParsedStory[];
}

export interface ParsedStory {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  labels: Record<string, string>;
  epicId: string;
}

export interface ParsedTask {
  id: string;
  title: string;
  description: string;
  phase: string;
  week: number;
  category: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
}

export interface ParsedBacklogItem {
  id: string;
  title: string;
  priority: string;
  status: string;
  agentOwner?: string;
  humanOwner?: string;
  restricted: boolean;
  notes?: string;
}

// ============================================
// ROADMAP.md Parser
// ============================================

export function parseRoadmapMarkdown(content: string): ParsedEpic[] {
  const epics: ParsedEpic[] = [];
  const lines = content.split('\n');

  let currentEpic: Partial<ParsedEpic> | null = null;
  let currentStory: Partial<ParsedStory> | null = null;
  let inAcceptanceCriteria = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match Epic headers: ## [Epic N] Title
    const epicMatch = line.match(/^## \[Epic (\d+)\] (.+)$/);
    if (epicMatch) {
      if (currentEpic && currentEpic.title) {
        if (currentStory && currentStory.title) {
          currentEpic.stories = currentEpic.stories || [];
          currentEpic.stories.push(currentStory as ParsedStory);
        }
        epics.push(currentEpic as ParsedEpic);
      }

      const epicNum = epicMatch[1];
      currentEpic = {
        id: `epic-${epicNum}`,
        title: epicMatch[2],
        description: '',
        horizon: 'H1',
        epicType: 'FOUNDATION',
        dependencies: [],
        stories: [],
      };
      currentStory = null;
      inAcceptanceCriteria = false;
      continue;
    }

    // Match Story headers: #### Story N.N: Title
    const storyMatch = line.match(/^#### Story (\d+\.\d+): (.+)$/);
    if (storyMatch && currentEpic) {
      if (currentStory && currentStory.title) {
        currentEpic.stories = currentEpic.stories || [];
        currentEpic.stories.push(currentStory as ParsedStory);
      }

      currentStory = {
        id: `story-${storyMatch[1]}`,
        title: storyMatch[2],
        description: '',
        acceptanceCriteria: [],
        labels: {},
        epicId: currentEpic.id || '',
      };
      inAcceptanceCriteria = false;
      continue;
    }

    // Parse epic metadata
    if (currentEpic && !currentStory) {
      const typeMatch = line.match(/^\*\s+\*\*Type:\*\*\s+(.+)$/);
      if (typeMatch) {
        currentEpic.epicType = typeMatch[1] as ParsedEpic['epicType'];
        continue;
      }

      const horizonMatch = line.match(/^\*\s+\*\*Horizon:\*\*\s+(.+)$/);
      if (horizonMatch) {
        currentEpic.horizon = horizonMatch[1];
        continue;
      }

      const userProblemMatch = line.match(/^\*\s+\*\*User & Problem:\*\*\s+(.+)$/);
      if (userProblemMatch) {
        currentEpic.description = userProblemMatch[1];
        continue;
      }

      const depsMatch = line.match(/^\*\s+\*\*Dependencies:\*\*\s+(.+)$/);
      if (depsMatch) {
        currentEpic.dependencies = depsMatch[1].split(',').map((d) => d.trim().replace(/`/g, ''));
        continue;
      }
    }

    // Parse story content
    if (currentStory) {
      const descMatch = line.match(/^\*\s+\*\*Description:\*\*\s+(.+)$/);
      if (descMatch) {
        currentStory.description = descMatch[1];
        continue;
      }

      if (line.includes('**Acceptance Criteria:**')) {
        inAcceptanceCriteria = true;
        continue;
      }

      if (inAcceptanceCriteria && line.match(/^\s+\*\s+\[.\]/)) {
        const criterion = line.replace(/^\s+\*\s+\[.\]\s*/, '').trim();
        currentStory.acceptanceCriteria = currentStory.acceptanceCriteria || [];
        currentStory.acceptanceCriteria.push(criterion);
        continue;
      }

      const labelsMatch = line.match(/^\*\s+\*\*Labels:\*\*\s+(.+)$/);
      if (labelsMatch) {
        inAcceptanceCriteria = false;
        const labelString = labelsMatch[1];
        const labels: Record<string, string> = {};
        const labelMatches = labelString.matchAll(/`([^:]+):([^`]+)`/g);
        for (const match of labelMatches) {
          labels[match[1]] = match[2];
        }
        currentStory.labels = labels;
        continue;
      }
    }
  }

  // Push final epic/story
  if (currentStory && currentStory.title && currentEpic) {
    currentEpic.stories = currentEpic.stories || [];
    currentEpic.stories.push(currentStory as ParsedStory);
  }
  if (currentEpic && currentEpic.title) {
    epics.push(currentEpic as ParsedEpic);
  }

  return epics;
}

// ============================================
// 90-Day War Room Parser
// ============================================

export function parseWarRoomBacklog(content: string): ParsedTask[] {
  const tasks: ParsedTask[] = [];
  const lines = content.split('\n');

  let currentPhase = '';
  let currentWeek = 0;

  for (const line of lines) {
    // Match phase headers: ### Phase N: Weeks X-Y
    const phaseMatch = line.match(/^### Phase (\d+): Weeks? (\d+)-?(\d+)?/);
    if (phaseMatch) {
      currentPhase = `Phase ${phaseMatch[1]}`;
      continue;
    }

    // Match week headers: #### Week N
    const weekMatch = line.match(/^#### Week (\d+)/);
    if (weekMatch) {
      currentWeek = parseInt(weekMatch[1], 10);
      continue;
    }

    // Match task lines: NN. Category: Description
    const taskMatch = line.match(/^(\d+)\.\s+(\w+):\s+(.+)$/);
    if (taskMatch && currentPhase) {
      const taskNum = taskMatch[1];
      const category = taskMatch[2];
      const description = taskMatch[3];

      // Determine priority based on phase and category
      let priority: ParsedTask['priority'] = 'P2';
      if (category === 'Security' || category === 'Cost') {
        priority = 'P1';
      }
      if (currentPhase === 'Phase 1') {
        priority = priority === 'P1' ? 'P0' : 'P1';
      }

      tasks.push({
        id: `war-room-${taskNum}`,
        title: `[${category}] ${description.slice(0, 60)}${description.length > 60 ? '...' : ''}`,
        description,
        phase: currentPhase,
        week: currentWeek,
        category,
        priority,
      });
    }
  }

  return tasks;
}

// ============================================
// TASK_BACKLOG.md Parser
// ============================================

export function parseTaskBacklog(content: string): ParsedBacklogItem[] {
  const items: ParsedBacklogItem[] = [];
  const lines = content.split('\n');

  // Find table start
  let inTable = false;

  for (const line of lines) {
    // Skip header and separator rows
    if (line.startsWith('| id') || line.startsWith('| ---')) {
      inTable = true;
      continue;
    }

    if (!inTable || !line.startsWith('|')) {
      continue;
    }

    // Parse table row
    const cells = line
      .split('|')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    if (cells.length >= 7) {
      const [id, title, priority, status, agentOwner, humanOwner, restricted, notes] = cells;

      items.push({
        id,
        title,
        priority: normalizePriority(priority),
        status: normalizeStatus(status),
        agentOwner: agentOwner !== '' ? agentOwner : undefined,
        humanOwner: humanOwner !== '' ? humanOwner : undefined,
        restricted: restricted === 'true',
        notes: notes || undefined,
      });
    }
  }

  return items;
}

// ============================================
// Helpers
// ============================================

function normalizePriority(priority: string): string {
  const p = priority.toLowerCase();
  if (p === 'high' || p === 'p0' || p === 'critical') {
    return 'P0';
  }
  if (p === 'medium' || p === 'p1') {
    return 'P1';
  }
  if (p === 'low' || p === 'p2') {
    return 'P2';
  }
  return 'P3';
}

function normalizeStatus(status: string): string {
  const s = status.toLowerCase().replace(/-/g, '_');
  if (s === 'in_progress' || s === 'active' || s === 'doing') {
    return 'in_progress';
  }
  if (s === 'done' || s === 'completed' || s === 'closed') {
    return 'done';
  }
  if (s === 'ready' || s === 'todo') {
    return 'ready';
  }
  if (s === 'queued' || s === 'backlog') {
    return 'backlog';
  }
  return 'backlog';
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getTargetQuarter(horizon: string): string {
  if (horizon === 'H1') {return 'Q1';}
  if (horizon === 'H2') {return 'Q2';}
  return 'Q3';
}

// ============================================
// Converters to Work Graph Types
// ============================================

export function convertEpicToNode(parsed: ParsedEpic): Epic {
  return {
    id: generateUUID(),
    type: 'epic',
    title: parsed.title,
    description: parsed.description,
    status: 'planned',
    owner: undefined,
    targetQuarter: getTargetQuarter(parsed.horizon),
    progress: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
  };
}

export function convertStoryToTicket(parsed: ParsedStory, _sprintId?: string): Ticket {
  const estimate = parsed.labels.estimate ? parseInt(parsed.labels.estimate.replace('d', ''), 10) : 3;
  const priority = (parsed.labels.priority?.toUpperCase() || 'P2') as Ticket['priority'];

  return {
    id: generateUUID(),
    type: 'ticket',
    title: parsed.title,
    description: `${parsed.description}\n\nAcceptance Criteria:\n${parsed.acceptanceCriteria.map((ac) => `- ${ac}`).join('\n')}`,
    status: 'backlog',
    priority,
    ticketType: 'feature',
    estimate,
    assignee: undefined,
    labels: Object.entries(parsed.labels).map(([k, v]) => `${k}:${v}`),
    agentEligible: true,
    complexity: 'medium',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
  };
}

export function convertTaskToTicket(parsed: ParsedTask): Ticket {
  return {
    id: generateUUID(),
    type: 'ticket',
    title: parsed.title,
    description: parsed.description,
    status: 'backlog',
    priority: parsed.priority,
    ticketType: 'chore',
    estimate: 3,
    assignee: undefined,
    labels: [parsed.category, parsed.phase, `week-${parsed.week}`],
    agentEligible: true,
    complexity: 'medium',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'war-room',
  };
}

export function convertBacklogItemToTicket(parsed: ParsedBacklogItem): Ticket {
  return {
    id: generateUUID(),
    type: 'ticket',
    title: parsed.title,
    description: parsed.notes || '',
    status: normalizeStatus(parsed.status) as Ticket['status'],
    priority: parsed.priority as Ticket['priority'],
    ticketType: 'chore',
    estimate: 3,
    assignee: parsed.agentOwner,
    labels: parsed.restricted ? ['restricted', 'human-only'] : [],
    agentEligible: !parsed.restricted,
    complexity: 'medium',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: parsed.humanOwner || 'system',
  };
}
