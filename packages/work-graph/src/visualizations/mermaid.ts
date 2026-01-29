/**
 * Summit Work Graph - Mermaid Visualization Generators
 *
 * Generate beautiful Mermaid diagrams from work graph data:
 * - Gantt charts for roadmaps and sprints
 * - Flowcharts for dependencies and workflows
 * - Timeline diagrams for milestones
 * - Quadrant charts for prioritization
 * - Journey diagrams for user flows
 */

import type {
  Ticket,
  Epic,
  Sprint,
  Milestone,
  Roadmap,
  Board,
  Intent,
  Commitment,
  Agent,
} from '../schema/nodes.js';
import type { WorkGraphEdge } from '../schema/edges.js';

// ============================================
// Types
// ============================================

export interface GanttTask {
  id: string;
  name: string;
  status: 'done' | 'active' | 'crit' | 'milestone';
  startDate?: Date;
  endDate?: Date;
  duration?: string;
  after?: string;
  section?: string;
}

export interface FlowNode {
  id: string;
  label: string;
  shape?: 'rect' | 'rounded' | 'stadium' | 'circle' | 'diamond' | 'hexagon';
  style?: string;
}

export interface FlowEdge {
  from: string;
  to: string;
  label?: string;
  style?: 'solid' | 'dotted' | 'thick';
}

export interface TimelineEvent {
  date: string;
  title: string;
  description?: string;
  section?: string;
}

export interface QuadrantItem {
  x: number;
  y: number;
  label: string;
}

// ============================================
// Helper Functions
// ============================================

function getMilestoneSection(status: string): string {
  if (status === 'achieved') {return 'Achieved';}
  if (status === 'at_risk') {return 'At Risk';}
  return 'Upcoming';
}

function getJourneyScore(progress: number, threshold: number, lowerThreshold?: number): number {
  if (progress > threshold) {return 5;}
  if (lowerThreshold !== undefined && progress > lowerThreshold) {return 4;}
  return lowerThreshold !== undefined ? 2 : 3;
}

// ============================================
// Gantt Chart Generator
// ============================================

export function generateGanttChart(options: {
  title: string;
  dateFormat?: string;
  axisFormat?: string;
  tasks: GanttTask[];
  sections?: string[];
}): string {
  const { title, dateFormat = 'YYYY-MM-DD', axisFormat = '%m/%d', tasks, sections } = options;

  const lines: string[] = [
    'gantt',
    `    title ${title}`,
    `    dateFormat ${dateFormat}`,
    `    axisFormat ${axisFormat}`,
    '',
  ];

  // Group tasks by section
  const tasksBySection = new Map<string, GanttTask[]>();
  for (const task of tasks) {
    const section = task.section || 'Tasks';
    const sectionTasks = tasksBySection.get(section);
    if (sectionTasks) {
      sectionTasks.push(task);
    } else {
      tasksBySection.set(section, [task]);
    }
  }

  // Use provided sections order or default to map order
  const sectionOrder = sections || Array.from(tasksBySection.keys());

  for (const section of sectionOrder) {
    const sectionTasks = tasksBySection.get(section);
    if (!sectionTasks || sectionTasks.length === 0) {continue;}

    lines.push(`    section ${section}`);

    for (const task of sectionTasks) {
      let taskLine = `    ${task.name}`;

      // Add status
      if (task.status === 'done') {
        taskLine += ' :done';
      } else if (task.status === 'active') {
        taskLine += ' :active';
      } else if (task.status === 'crit') {
        taskLine += ' :crit';
      } else if (task.status === 'milestone') {
        taskLine += ' :milestone';
      }

      // Add ID
      taskLine += `, ${task.id}`;

      // Add timing
      if (task.after) {
        taskLine += `, after ${task.after}`;
        if (task.duration) {
          taskLine += `, ${task.duration}`;
        }
      } else if (task.startDate) {
        taskLine += `, ${formatDate(task.startDate)}`;
        if (task.endDate) {
          taskLine += `, ${formatDate(task.endDate)}`;
        } else if (task.duration) {
          taskLine += `, ${task.duration}`;
        }
      }

      lines.push(taskLine);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ============================================
// Roadmap Gantt Generator
// ============================================

export function generateRoadmapGantt(
  roadmap: Roadmap,
  epics: Epic[],
  milestones: Milestone[],
  tickets?: Ticket[]
): string {
  const tasks: GanttTask[] = [];

  // Add milestones
  for (const milestone of milestones) {
    tasks.push({
      id: `m_${milestone.id.slice(0, 8)}`,
      name: `${getMilestoneIcon(milestone.milestoneType)} ${milestone.name}`,
      status: 'milestone',
      startDate: milestone.targetDate,
      section: 'Milestones',
    });
  }

  // Add epics by status
  const epicsByStatus = groupBy(epics, (e) => e.status);

  for (const [status, statusEpics] of Object.entries(epicsByStatus)) {
    for (const epic of statusEpics) {
      const ganttStatus = mapEpicStatus(epic.status);
      tasks.push({
        id: `e_${epic.id.slice(0, 8)}`,
        name: epic.title,
        status: ganttStatus,
        startDate: epic.createdAt,
        duration: estimateEpicDuration(epic, tickets),
        section: capitalizeFirst(status.replace('_', ' ')),
      });
    }
  }

  return generateGanttChart({
    title: roadmap.name,
    tasks,
    sections: ['Milestones', 'In Progress', 'Planned', 'Completed', 'Draft'],
  });
}

// ============================================
// Sprint Gantt Generator
// ============================================

export function generateSprintGantt(sprint: Sprint, tickets: Ticket[]): string {
  const tasks: GanttTask[] = [];

  // Sort tickets by priority and status
  const sortedTickets = [...tickets].sort((a, b) => {
    const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
    const statusOrder = { done: 0, review: 1, in_progress: 2, ready: 3, backlog: 4, blocked: 5 };
    return (
      (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4) ||
      (statusOrder[a.status] || 6) - (statusOrder[b.status] || 6)
    );
  });

  // Group by status for sections
  const statusGroups: Record<string, Ticket[]> = {
    'In Progress': [],
    'In Review': [],
    'Done': [],
    'Ready': [],
    'Blocked': [],
  };

  for (const ticket of sortedTickets) {
    const section = mapTicketStatusToSection(ticket.status);
    if (statusGroups[section]) {
      statusGroups[section].push(ticket);
    }
  }

  for (const [section, sectionTickets] of Object.entries(statusGroups)) {
    for (const ticket of sectionTickets) {
      tasks.push({
        id: `t_${ticket.id.slice(0, 8)}`,
        name: `${getPriorityIcon(ticket.priority)} ${truncate(ticket.title, 40)}`,
        status: mapTicketStatusToGantt(ticket.status),
        startDate: sprint.startDate,
        duration: `${ticket.estimate || 1}d`,
        section,
      });
    }
  }

  return generateGanttChart({
    title: `${sprint.name} (Sprint ${sprint.number})`,
    tasks,
    sections: ['In Progress', 'In Review', 'Ready', 'Done', 'Blocked'],
  });
}

// ============================================
// Dependency Flowchart Generator
// ============================================

export function generateDependencyGraph(
  nodes: Array<Ticket | Epic>,
  edges: WorkGraphEdge[],
  options: {
    title?: string;
    direction?: 'TB' | 'BT' | 'LR' | 'RL';
    showStatus?: boolean;
    showPriority?: boolean;
  } = {}
): string {
  const { direction = 'TB', showStatus = true, showPriority = true } = options;

  const lines: string[] = [`flowchart ${direction}`];

  // Build node map for quick lookup
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Filter relevant edges
  const relevantEdges = edges.filter(
    (e) =>
      (e.type === 'depends_on' || e.type === 'blocks' || e.type === 'implements') &&
      nodeMap.has(e.sourceId) &&
      nodeMap.has(e.targetId)
  );

  // Track which nodes are connected
  const connectedNodes = new Set<string>();
  for (const edge of relevantEdges) {
    connectedNodes.add(edge.sourceId);
    connectedNodes.add(edge.targetId);
  }

  // Add connected nodes
  for (const nodeId of connectedNodes) {
    const node = nodeMap.get(nodeId);
    if (!node) {continue;}

    const shortId = nodeId.slice(0, 8);
    let label = node.title;

    if (showPriority && 'priority' in node) {
      label = `${getPriorityIcon(node.priority)} ${label}`;
    }

    if (showStatus) {
      label = `${label}<br/><small>${node.status}</small>`;
    }

    const shape = getNodeShape(node);
    lines.push(`    ${shortId}${shape.open}"${escapeLabel(label)}"${shape.close}`);

    // Add styling based on status
    const style = getNodeStyle(node);
    if (style) {
      lines.push(`    style ${shortId} ${style}`);
    }
  }

  lines.push('');

  // Add edges
  for (const edge of relevantEdges) {
    const sourceId = edge.sourceId.slice(0, 8);
    const targetId = edge.targetId.slice(0, 8);
    const edgeStyle = getEdgeStyle(edge.type);
    const label = getEdgeLabel(edge.type);

    lines.push(`    ${sourceId} ${edgeStyle.arrow} ${targetId}`);
    if (label) {
      // Add label on the last edge line
      const lastIdx = lines.length - 1;
      lines[lastIdx] = `    ${sourceId} ${edgeStyle.arrow}|${label}| ${targetId}`;
    }
  }

  return lines.join('\n');
}

// ============================================
// Epic Breakdown Flowchart
// ============================================

export function generateEpicBreakdown(
  epic: Epic,
  tickets: Ticket[],
  edges: WorkGraphEdge[]
): string {
  const lines: string[] = ['flowchart TB'];

  // Epic at the top
  const epicId = `epic_${epic.id.slice(0, 8)}`;
  lines.push(`    ${epicId}[["${getPriorityIcon('P0')} ${escapeLabel(epic.title)}"]]`);
  lines.push(`    style ${epicId} fill:#6366f1,stroke:#4f46e5,color:#fff`);
  lines.push('');

  // Group tickets by status
  const byStatus = groupBy(tickets, (t) => t.status);
  const statusOrder = ['done', 'in_progress', 'review', 'ready', 'backlog', 'blocked'];

  // Create subgraphs for each status
  for (const status of statusOrder) {
    const statusTickets = byStatus[status];
    if (!statusTickets || statusTickets.length === 0) {continue;}

    const subgraphName = capitalizeFirst(status.replace('_', ' '));
    lines.push(`    subgraph ${status}["${subgraphName} (${statusTickets.length})"]`);

    for (const ticket of statusTickets) {
      const ticketId = `t_${ticket.id.slice(0, 8)}`;
      const icon = getPriorityIcon(ticket.priority);
      lines.push(`        ${ticketId}("${icon} ${escapeLabel(truncate(ticket.title, 35))}")`);
    }

    lines.push('    end');
    lines.push('');
  }

  // Connect epic to first ticket in each status group
  for (const status of statusOrder) {
    const statusTickets = byStatus[status];
    if (statusTickets && statusTickets.length > 0) {
      const firstTicketId = `t_${statusTickets[0].id.slice(0, 8)}`;
      lines.push(`    ${epicId} --> ${firstTicketId}`);
    }
  }

  // Add dependency edges between tickets
  const ticketIds = new Set(tickets.map((t) => t.id));
  const ticketEdges = edges.filter(
    (e) =>
      (e.type === 'depends_on' || e.type === 'blocks') &&
      ticketIds.has(e.sourceId) &&
      ticketIds.has(e.targetId)
  );

  if (ticketEdges.length > 0) {
    lines.push('');
    for (const edge of ticketEdges) {
      const sourceId = `t_${edge.sourceId.slice(0, 8)}`;
      const targetId = `t_${edge.targetId.slice(0, 8)}`;
      const arrow = edge.type === 'blocks' ? '-.-x' : '-->';
      lines.push(`    ${sourceId} ${arrow} ${targetId}`);
    }
  }

  // Style the status subgraphs
  lines.push('');
  lines.push('    style done fill:#dcfce7,stroke:#22c55e');
  lines.push('    style in_progress fill:#dbeafe,stroke:#3b82f6');
  lines.push('    style review fill:#fef3c7,stroke:#f59e0b');
  lines.push('    style ready fill:#f3e8ff,stroke:#a855f7');
  lines.push('    style backlog fill:#f1f5f9,stroke:#64748b');
  lines.push('    style blocked fill:#fee2e2,stroke:#ef4444');

  return lines.join('\n');
}

// ============================================
// Timeline Diagram Generator
// ============================================

export function generateTimeline(
  events: TimelineEvent[],
  options: { title?: string } = {}
): string {
  const { title = 'Timeline' } = options;

  const lines: string[] = ['timeline', `    title ${title}`];

  // Group events by section
  const bySection = groupBy(events, (e) => e.section || 'Events');

  for (const [section, sectionEvents] of Object.entries(bySection)) {
    lines.push(`    section ${section}`);
    for (const event of sectionEvents) {
      if (event.description) {
        lines.push(`        ${event.date} : ${event.title}`);
        lines.push(`            : ${event.description}`);
      } else {
        lines.push(`        ${event.date} : ${event.title}`);
      }
    }
  }

  return lines.join('\n');
}

// ============================================
// Milestone Timeline Generator
// ============================================

export function generateMilestoneTimeline(milestones: Milestone[], roadmap?: Roadmap): string {
  const events: TimelineEvent[] = milestones
    .sort((a, b) => a.targetDate.getTime() - b.targetDate.getTime())
    .map((m) => ({
      date: formatDateShort(m.targetDate),
      title: `${getMilestoneIcon(m.milestoneType)} ${m.name}`,
      description: m.status === 'achieved' ? 'Completed' : `${m.progress}% complete`,
      section: getMilestoneSection(m.status),
    }));

  return generateTimeline(events, {
    title: roadmap ? `${roadmap.name} Milestones` : 'Roadmap Milestones',
  });
}

// ============================================
// Quadrant Chart (Prioritization Matrix)
// ============================================

export function generatePriorityQuadrant(tickets: Ticket[]): string {
  const lines: string[] = [
    'quadrantChart',
    '    title Priority vs Complexity Matrix',
    '    x-axis Low Complexity --> High Complexity',
    '    y-axis Low Priority --> High Priority',
    '    quadrant-1 Quick Wins',
    '    quadrant-2 Major Projects',
    '    quadrant-3 Fill-ins',
    '    quadrant-4 Strategic',
    '',
  ];

  const complexityMap: Record<string, number> = {
    trivial: 0.15,
    simple: 0.35,
    medium: 0.55,
    complex: 0.8,
    unknown: 0.5,
  };

  const priorityMap: Record<string, number> = {
    P0: 0.95,
    P1: 0.75,
    P2: 0.45,
    P3: 0.2,
  };

  for (const ticket of tickets.slice(0, 20)) {
    // Limit to 20 for readability
    const x = complexityMap[ticket.complexity] || 0.5;
    const y = priorityMap[ticket.priority] || 0.5;
    // Add small random offset to prevent overlap
    const jitterX = (Math.random() - 0.5) * 0.1;
    const jitterY = (Math.random() - 0.5) * 0.1;
    const label = truncate(ticket.title, 25);
    lines.push(`    ${label}: [${(x + jitterX).toFixed(2)}, ${(y + jitterY).toFixed(2)}]`);
  }

  return lines.join('\n');
}

// ============================================
// Kanban Board Visualization
// ============================================

export function generateKanbanBoard(board: Board, tickets: Ticket[]): string {
  const lines: string[] = ['flowchart LR'];

  // Create subgraphs for each column
  for (const column of board.columns.sort((a, b) => a.position - b.position)) {
    const columnTickets = tickets.filter((t) => mapTicketStatusToColumn(t.status) === column.name);

    lines.push(`    subgraph ${sanitizeId(column.name)}["${column.name} (${columnTickets.length})"]`);
    lines.push('        direction TB');

    if (columnTickets.length === 0) {
      lines.push(`        empty_${sanitizeId(column.name)}[" "]`);
      lines.push(`        style empty_${sanitizeId(column.name)} fill:none,stroke:none`);
    } else {
      for (const ticket of columnTickets.slice(0, 8)) {
        // Limit per column
        const ticketId = `t_${ticket.id.slice(0, 8)}`;
        const icon = getPriorityIcon(ticket.priority);
        const assignee = ticket.assignee ? `<br/><small>@${ticket.assignee}</small>` : '';
        lines.push(
          `        ${ticketId}("${icon} ${escapeLabel(truncate(ticket.title, 30))}${assignee}")`
        );

        // Style based on priority
        const style = getPriorityStyle(ticket.priority);
        lines.push(`        style ${ticketId} ${style}`);
      }
    }

    lines.push('    end');
    lines.push('');
  }

  // Connect columns with invisible edges for layout
  const columnIds = board.columns
    .sort((a, b) => a.position - b.position)
    .map((c) => sanitizeId(c.name));

  for (let i = 0; i < columnIds.length - 1; i++) {
    lines.push(`    ${columnIds[i]} ~~~ ${columnIds[i + 1]}`);
  }

  // Style columns
  lines.push('');
  lines.push(`    style ${sanitizeId('Icebox')} fill:#f8fafc,stroke:#94a3b8`);
  lines.push(`    style ${sanitizeId('Backlog')} fill:#f1f5f9,stroke:#64748b`);
  lines.push(`    style ${sanitizeId('Ready')} fill:#f3e8ff,stroke:#a855f7`);
  lines.push(`    style ${sanitizeId('In Progress')} fill:#dbeafe,stroke:#3b82f6`);
  lines.push(`    style ${sanitizeId('Review')} fill:#fef3c7,stroke:#f59e0b`);
  lines.push(`    style ${sanitizeId('Done')} fill:#dcfce7,stroke:#22c55e`);

  return lines.join('\n');
}

// ============================================
// Agent Workload Chart
// ============================================

export function generateAgentWorkload(agents: Agent[], tickets: Ticket[]): string {
  const lines: string[] = [
    'pie showData',
    '    title Agent Workload Distribution',
  ];

  // Count tickets per agent
  const workload = new Map<string, number>();
  let unassigned = 0;

  for (const ticket of tickets) {
    if (ticket.assignee) {
      workload.set(ticket.assignee, (workload.get(ticket.assignee) || 0) + 1);
    } else {
      unassigned++;
    }
  }

  // Add agent entries
  for (const agent of agents) {
    const count = workload.get(agent.id) || workload.get(agent.name) || 0;
    if (count > 0) {
      lines.push(`    "${agent.name}" : ${count}`);
    }
  }

  // Add unassigned
  if (unassigned > 0) {
    lines.push(`    "Unassigned" : ${unassigned}`);
  }

  return lines.join('\n');
}

// ============================================
// Commitment Journey Diagram
// ============================================

export function generateCommitmentJourney(
  commitment: Commitment,
  tickets: Ticket[],
  _milestones: Milestone[]
): string {
  const lines: string[] = [
    'journey',
    `    title ${commitment.title}`,
    `    section Customer: ${commitment.customer}`,
  ];

  // Calculate overall progress
  const doneTickets = tickets.filter((t) => t.status === 'done').length;
  const progress = tickets.length > 0 ? Math.round((doneTickets / tickets.length) * 100) : 0;

  // Add journey stages
  lines.push(`        Commitment Made: 5: Sales, Customer`);
  lines.push(`        Planning: ${getJourneyScore(progress, 20)}: Product, Engineering`);
  lines.push(`        Development: ${getJourneyScore(progress, 50, 20)}: Engineering`);
  lines.push(`        Testing: ${getJourneyScore(progress, 80, 50)}: QA, Engineering`);
  lines.push(`        Delivery: ${progress >= 100 ? 5 : 2}: Engineering, Customer`);

  return lines.join('\n');
}

// ============================================
// Intent to Delivery Flow
// ============================================

export function generateIntentFlow(
  intent: Intent,
  epics: Epic[],
  tickets: Ticket[],
  edges: WorkGraphEdge[]
): string {
  const lines: string[] = ['flowchart TB'];

  // Intent node
  const intentId = `intent_${intent.id.slice(0, 8)}`;
  lines.push(`    ${intentId}{{"${getPriorityIcon(intent.priority)} ${escapeLabel(intent.title)}"}}`);
  lines.push(`    style ${intentId} fill:#8b5cf6,stroke:#7c3aed,color:#fff`);
  lines.push('');

  // Epics subgraph
  if (epics.length > 0) {
    lines.push('    subgraph epics["Epics"]');
    for (const epic of epics) {
      const epicId = `epic_${epic.id.slice(0, 8)}`;
      lines.push(`        ${epicId}[["${escapeLabel(epic.title)}"]]`);
      const style = getStatusStyle(epic.status);
      lines.push(`        style ${epicId} ${style}`);
    }
    lines.push('    end');
    lines.push('');

    // Connect intent to epics
    for (const epic of epics) {
      const epicId = `epic_${epic.id.slice(0, 8)}`;
      lines.push(`    ${intentId} --> ${epicId}`);
    }
  }

  // Tickets subgraph
  if (tickets.length > 0) {
    lines.push('');
    lines.push('    subgraph tickets["Tickets"]');
    for (const ticket of tickets.slice(0, 10)) {
      // Limit for readability
      const ticketId = `ticket_${ticket.id.slice(0, 8)}`;
      const icon = getPriorityIcon(ticket.priority);
      lines.push(`        ${ticketId}("${icon} ${escapeLabel(truncate(ticket.title, 30))}")`);
    }
    lines.push('    end');

    // Connect epics to tickets
    const ticketIds = new Set(tickets.map((t) => t.id));
    const implementsEdges = edges.filter((e) => e.type === 'implements' && ticketIds.has(e.sourceId));

    for (const edge of implementsEdges) {
      const epicId = `epic_${edge.targetId.slice(0, 8)}`;
      const ticketId = `ticket_${edge.sourceId.slice(0, 8)}`;
      lines.push(`    ${epicId} --> ${ticketId}`);
    }
  }

  return lines.join('\n');
}

// ============================================
// Helper Functions
// ============================================

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function truncate(str: string, length: number): string {
  if (str.length <= length) {return str;}
  return `${str.slice(0, length - 3)  }...`;
}

function escapeLabel(str: string): string {
  return str.replace(/"/g, "'").replace(/[<>]/g, '');
}

function sanitizeId(str: string): string {
  return str.replace(/[^a-zA-Z0-9]/g, '_');
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function groupBy<T>(arr: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of arr) {
    const key = keyFn(item);
    if (!result[key]) {result[key] = [];}
    result[key].push(item);
  }
  return result;
}

function getPriorityIcon(priority: string): string {
  const icons: Record<string, string> = {
    P0: '🔴',
    P1: '🟠',
    P2: '🟡',
    P3: '🟢',
  };
  return icons[priority] || '⚪';
}

function getMilestoneIcon(type: string): string {
  const icons: Record<string, string> = {
    release: '🚀',
    checkpoint: '🏁',
    deadline: '⏰',
    event: '📅',
  };
  return icons[type] || '◆';
}

function mapEpicStatus(status: string): 'done' | 'active' | 'crit' | 'milestone' {
  const map: Record<string, 'done' | 'active' | 'crit' | 'milestone'> = {
    completed: 'done',
    in_progress: 'active',
    planned: 'crit',
    draft: 'crit',
    cancelled: 'done',
  };
  return map[status] || 'crit';
}

function mapTicketStatusToGantt(status: string): 'done' | 'active' | 'crit' | 'milestone' {
  const map: Record<string, 'done' | 'active' | 'crit' | 'milestone'> = {
    done: 'done',
    in_progress: 'active',
    review: 'active',
    ready: 'crit',
    backlog: 'crit',
    blocked: 'crit',
  };
  return map[status] || 'crit';
}

function mapTicketStatusToSection(status: string): string {
  const map: Record<string, string> = {
    done: 'Done',
    in_progress: 'In Progress',
    review: 'In Review',
    ready: 'Ready',
    backlog: 'Ready',
    blocked: 'Blocked',
  };
  return map[status] || 'Ready';
}

function mapTicketStatusToColumn(status: string): string {
  const map: Record<string, string> = {
    backlog: 'Backlog',
    ready: 'Ready',
    in_progress: 'In Progress',
    review: 'Review',
    done: 'Done',
    blocked: 'Blocked',
  };
  return map[status] || 'Backlog';
}

function estimateEpicDuration(epic: Epic, tickets?: Ticket[]): string {
  if (!tickets) {return '14d';}
  const epicTickets = tickets.filter((t) => t.description?.includes(epic.id));
  const totalEstimate = epicTickets.reduce((sum, t) => sum + (t.estimate || 2), 0);
  return `${Math.max(totalEstimate, 7)}d`;
}

function getNodeShape(node: { type: string }): { open: string; close: string } {
  const shapes: Record<string, { open: string; close: string }> = {
    epic: { open: '[[', close: ']]' },
    ticket: { open: '(', close: ')' },
    intent: { open: '{{', close: '}}' },
  };
  return shapes[node.type] || { open: '[', close: ']' };
}

function getNodeStyle(node: { status: string }): string {
  const styles: Record<string, string> = {
    done: 'fill:#dcfce7,stroke:#22c55e',
    completed: 'fill:#dcfce7,stroke:#22c55e',
    in_progress: 'fill:#dbeafe,stroke:#3b82f6',
    review: 'fill:#fef3c7,stroke:#f59e0b',
    ready: 'fill:#f3e8ff,stroke:#a855f7',
    backlog: 'fill:#f1f5f9,stroke:#64748b',
    blocked: 'fill:#fee2e2,stroke:#ef4444',
  };
  return styles[node.status] || '';
}

function getStatusStyle(status: string): string {
  return getNodeStyle({ status });
}

function getPriorityStyle(priority: string): string {
  const styles: Record<string, string> = {
    P0: 'fill:#fee2e2,stroke:#ef4444',
    P1: 'fill:#ffedd5,stroke:#f97316',
    P2: 'fill:#fef9c3,stroke:#eab308',
    P3: 'fill:#dcfce7,stroke:#22c55e',
  };
  return styles[priority] || 'fill:#f1f5f9,stroke:#64748b';
}

function getEdgeStyle(edgeType: string): { arrow: string } {
  const styles: Record<string, { arrow: string }> = {
    depends_on: { arrow: '-->' },
    blocks: { arrow: '-.-x' },
    implements: { arrow: '==>' },
  };
  return styles[edgeType] || { arrow: '-->' };
}

function getEdgeLabel(edgeType: string): string {
  const labels: Record<string, string> = {
    depends_on: 'depends on',
    blocks: 'blocks',
    implements: 'implements',
  };
  return labels[edgeType] || '';
}

// ============================================
// Export All Generators
// ============================================

export const MermaidGenerators = {
  gantt: generateGanttChart,
  roadmapGantt: generateRoadmapGantt,
  sprintGantt: generateSprintGantt,
  dependencyGraph: generateDependencyGraph,
  epicBreakdown: generateEpicBreakdown,
  timeline: generateTimeline,
  milestoneTimeline: generateMilestoneTimeline,
  priorityQuadrant: generatePriorityQuadrant,
  kanbanBoard: generateKanbanBoard,
  agentWorkload: generateAgentWorkload,
  commitmentJourney: generateCommitmentJourney,
  intentFlow: generateIntentFlow,
};
