#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Summit Work Graph - CLI
 *
 * Command line interface for interacting with the Work Graph.
 */

const GRAPHQL_URL = process.env.WORK_GRAPH_URL || 'http://localhost:4000/graphql';

// GraphQL client helper
async function graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  const result = (await response.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (result.errors) {
    throw new Error(result.errors.map((e: { message: string }) => e.message).join('\n'));
  }
  return result.data as T;
}

// Commands
const commands: Record<string, (args: string[]) => Promise<void>> = {
  // Query commands
  async query(args: string[]) {
    const [nodeType] = args;
    if (!nodeType) {
      console.log('Usage: pnpm cli query <type>');
      console.log('Types: tickets, epics, intents, agents, boards, roadmaps, milestones, commitments, sprints');
      return;
    }

    const queries: Record<string, string> = {
      tickets: `query { tickets { id title status priority assignee agentEligible } }`,
      epics: `query { epics { id title status progress } }`,
      intents: `query { intents { id title source priority status } }`,
      agents: `query { agents { id name status successRate completedTasks } }`,
      boards: `query { boards { id name boardType itemCount } }`,
      roadmaps: `query { roadmaps { id name status } }`,
      milestones: `query { milestones { id name targetDate status progress } }`,
      commitments: `query { commitments { id title customer dueDate confidence status } }`,
      sprints: `query { sprints { id name status committed completed } }`,
    };

    const q = queries[nodeType];
    if (!q) {
      console.log(`Unknown type: ${nodeType}`);
      return;
    }

    const data = await graphql<Record<string, Array<Record<string, unknown>>>>(q);
    const items = data[nodeType] || [];
    console.log(`\n${nodeType.toUpperCase()} (${items.length})\n${'='.repeat(40)}`);
    for (const item of items) {
      console.log(formatItem(item));
    }
  },

  // Server command (just shows info)
  server() {
    console.log('To start the server, run: pnpm server');
    console.log(`GraphQL endpoint: ${GRAPHQL_URL}`);
    return Promise.resolve();
  },

  // Board commands
  async board(args: string[]) {
    const [subcommand, ...rest] = args;

    switch (subcommand) {
      case 'list': {
        const data = await graphql<{ boards: Array<{ id: string; name: string; boardType: string; itemCount: number }> }>(
          `query { boards { id name boardType itemCount } }`
        );
        console.log('\nBOARDS');
        console.log('='.repeat(60));
        for (const board of data.boards) {
          console.log(`  ${board.name} (${board.boardType}) - ${board.itemCount} items`);
        }
        break;
      }
      case 'create': {
        const [name] = rest;
        if (!name) {
          console.log('Usage: pnpm cli board create <name>');
          return;
        }
        const data = await graphql<{ createBoard: { id: string; name: string } }>(
          `mutation($name: String!) {
            createBoard(input: { name: $name, boardType: "kanban" }) { id name }
          }`,
          { name }
        );
        console.log(`Created board: ${data.createBoard.name} (${data.createBoard.id})`);
        break;
      }
      default:
        console.log('Board commands: list, create <name>');
    }
  },

  // Roadmap commands
  async roadmap(args: string[]) {
    const [subcommand] = args;

    switch (subcommand) {
      case 'list': {
        const data = await graphql<{ roadmaps: Array<{ id: string; name: string; status: string }> }>(
          `query { roadmaps { id name status } }`
        );
        console.log('\nROADMAPS');
        console.log('='.repeat(60));
        for (const r of data.roadmaps) {
          console.log(`  ${r.name} [${r.status}]`);
        }
        break;
      }
      case 'show': {
        const data = await graphql<{
          roadmaps: Array<{ id: string; name: string; status: string }>;
          milestones: Array<{ id: string; name: string; targetDate: string; status: string; progress: number }>;
          epics: Array<{ id: string; title: string; status: string; progress: number }>;
        }>(`query {
          roadmaps { id name status }
          milestones { id name targetDate status progress }
          epics { id title status progress }
        }`);

        console.log('\nROADMAP VIEW');
        console.log('='.repeat(60));

        const milestones = data.milestones.sort(
          (a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
        );

        console.log('\nMilestones:');
        for (const m of milestones) {
          const date = new Date(m.targetDate).toLocaleDateString();
          let status = '[ ]';
          if (m.status === 'achieved') status = '[x]';
          else if (m.status === 'at_risk') status = '[!]';
          console.log(`  ${status} ${m.name} - ${date} (${m.progress}%)`);
        }

        // Show epics
        console.log('\nEpics:');
        for (const e of data.epics) {
          const bar = '\u2588'.repeat(Math.floor(e.progress / 10)) + '\u2591'.repeat(10 - Math.floor(e.progress / 10));
          console.log(`  ${bar} ${e.title} (${e.progress}%)`);
        }
        break;
      }
      default:
        console.log('Roadmap commands: list, show');
    }
  },

  // Milestone commands
  async milestone(args: string[]) {
    const [subcommand, ...rest] = args;

    switch (subcommand) {
      case 'list': {
        const data = await graphql<{
          milestones: Array<{ id: string; name: string; targetDate: string; status: string; progress: number }>;
        }>(`query { milestones { id name targetDate status progress } }`);
        console.log('\nMILESTONES');
        console.log('='.repeat(60));
        for (const m of data.milestones) {
          const date = new Date(m.targetDate).toLocaleDateString();
          let status = '\u25CB';
          if (m.status === 'achieved') status = '\u2713';
          else if (m.status === 'at_risk') status = '!';
          console.log(`  ${status} ${m.name} - ${date} (${m.progress}%)`);
        }
        break;
      }
      case 'create': {
        const [name, dateStr] = rest;
        if (!name || !dateStr) {
          console.log('Usage: pnpm cli milestone create <name> <date>');
          return;
        }
        const data = await graphql<{ createMilestone: { id: string; name: string } }>(
          `mutation($name: String!, $targetDate: DateTime!) {
            createMilestone(input: { name: $name, targetDate: $targetDate, milestoneType: "checkpoint", status: "planned" }) { id name }
          }`,
          { name, targetDate: new Date(dateStr).toISOString() }
        );
        console.log(`Created milestone: ${data.createMilestone.name}`);
        break;
      }
      default:
        console.log('Milestone commands: list, create <name> <date>');
    }
  },

  // Ticket commands
  async ticket(args: string[]) {
    const [subcommand, ...rest] = args;

    switch (subcommand) {
      case 'list': {
        const data = await graphql<{
          tickets: Array<{ id: string; title: string; status: string; priority: string; assignee?: string }>;
        }>(`query { tickets { id title status priority assignee } }`);
        console.log('\nTICKETS');
        console.log('='.repeat(60));
        for (const t of data.tickets) {
          const assignee = t.assignee || 'unassigned';
          console.log(`  [${t.priority}] ${t.title} - ${t.status} (${assignee})`);
        }
        break;
      }
      case 'create': {
        const title = rest.join(' ');
        if (!title) {
          console.log('Usage: pnpm cli ticket create <title>');
          return;
        }
        const data = await graphql<{ createTicket: { id: string; title: string } }>(
          `mutation($title: String!) {
            createTicket(input: { title: $title, status: "backlog", priority: "P2" }) { id title }
          }`,
          { title }
        );
        console.log(`Created ticket: ${data.createTicket.title} (${data.createTicket.id})`);
        break;
      }
      default:
        console.log('Ticket commands: list, create <title>');
    }
  },

  // Import commands
  async import(args: string[]) {
    const [subcommand, ...rest] = args;

    switch (subcommand) {
      case 'backlog': {
        const [filepath] = rest;
        if (!filepath) {
          console.log('Usage: pnpm cli import backlog <filepath>');
          return;
        }
        console.log(`Importing from ${filepath}...`);
        // Note: This requires the server to be running and have the importBacklog mutation
        console.log('Import via CLI requires server-side implementation');
        break;
      }
      case 'todos': {
        const [dirPath] = rest;
        if (!dirPath) {
          console.log('Usage: pnpm cli import todos <directory>');
          return;
        }
        console.log(`Scanning for TODOs in ${dirPath}...`);
        console.log('Import via CLI requires server-side implementation');
        break;
      }
      default:
        console.log('Import commands: backlog <file>, todos <directory>');
    }
  },

  // Stats command
  async stats() {
    const data = await graphql<{
      tickets: Array<{ id: string; status: string; agentEligible: boolean }>;
      agents: Array<{ id: string; status: string }>;
      epics: Array<{ id: string; progress: number }>;
      commitments: Array<{ id: string; status: string }>;
    }>(`query {
      tickets { id status agentEligible }
      agents { id status }
      epics { id progress }
      commitments { id status }
    }`);

    console.log('\nWORK GRAPH STATISTICS');
    console.log('='.repeat(60));
    console.log(`Tickets: ${data.tickets.length}`);
    console.log(`Epics: ${data.epics.length}`);
    console.log(`Commitments: ${data.commitments.length}`);
    console.log(`Agents: ${data.agents.length}`);

    const byStatus: Record<string, number> = {};
    for (const t of data.tickets) {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    }
    console.log('\nTickets by Status:');
    for (const [status, count] of Object.entries(byStatus)) {
      console.log(`  ${status}: ${count}`);
    }

    const agentEligible = data.tickets.filter((t) => t.agentEligible).length;
    console.log(`\nAgent-Eligible: ${agentEligible} (${Math.round((agentEligible / data.tickets.length) * 100)}%)`);

    const available = data.agents.filter((a) => a.status === 'available').length;
    const busy = data.agents.filter((a) => a.status === 'busy').length;
    console.log(`Agents: Available: ${available}  Busy: ${busy}`);
  },

  // Help command
  help() {
    console.log(`
Summit Work Graph CLI

Commands:
  query <type>            Query nodes (tickets, epics, agents, boards, etc.)
  stats                   Show graph statistics

  board list              List all boards
  board create <name>     Create a new board

  roadmap list            List all roadmaps
  roadmap show            Show roadmap with milestones and epics

  milestone list          List all milestones
  milestone create <n> <d> Create a milestone with name and date

  ticket list             List all tickets
  ticket create <title>   Create a new ticket

  import backlog <file>   Import from markdown file
  import todos <dir>      Import TODO comments from source

  help                    Show this help
`);
    return Promise.resolve();
  },
};

// Format helper
function formatItem(item: Record<string, unknown>): string {
  const parts: string[] = [];
  if (item.title) parts.push(item.title as string);
  if (item.name) parts.push(item.name as string);
  if (item.status) parts.push(`[${item.status}]`);
  if (item.priority) parts.push(`(${item.priority})`);
  return `  ${parts.join(' ')}`;
}

// Main
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  const handler = commands[command];
  if (!handler) {
    console.log(`Unknown command: ${command}`);
    commands.help([]);
    process.exit(1);
  }

  try {
    await handler(args.slice(1));
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
