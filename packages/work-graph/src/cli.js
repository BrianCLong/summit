#!/usr/bin/env node
"use strict";
/* eslint-disable no-console */
/**
 * Summit Work Graph - CLI
 *
 * Command-line interface for the work graph with visualization support.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
const GRAPHQL_URL = process.env.WORK_GRAPH_URL || 'http://localhost:4000/graphql';
// ============================================
// GraphQL Client
// ============================================
async function graphql(query, variables) {
    const response = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
    });
    const result = (await response.json());
    if (result.errors) {
        throw new Error(result.errors.map((e) => e.message).join('\n'));
    }
    return result.data;
}
// ============================================
// Visualization Commands
// ============================================
async function vizRoadmap() {
    console.log('Generating Roadmap Gantt Chart...\n');
    const data = await graphql(`query { vizRoadmap { type title mermaid } }`);
    console.log('```mermaid');
    console.log(data.vizRoadmap.mermaid);
    console.log('```');
}
async function vizSprint(sprintNumber) {
    console.log('Generating Sprint Gantt Chart...\n');
    const query = sprintNumber
        ? `query { vizSprint(number: ${parseInt(sprintNumber, 10)}) { type title mermaid } }`
        : `query { vizSprint { type title mermaid } }`;
    const data = await graphql(query);
    console.log('```mermaid');
    console.log(data.vizSprint.mermaid);
    console.log('```');
}
async function vizDependencies() {
    console.log('Generating Dependency Graph...\n');
    const data = await graphql(`query { vizDependencies { type title mermaid } }`);
    console.log('```mermaid');
    console.log(data.vizDependencies.mermaid);
    console.log('```');
}
async function vizEpic(epicId) {
    console.log('Generating Epic Breakdown...\n');
    const query = epicId
        ? `query { vizEpic(id: "${epicId}") { type title mermaid } }`
        : `query { vizEpic { type title mermaid } }`;
    const data = await graphql(query);
    console.log('```mermaid');
    console.log(data.vizEpic.mermaid);
    console.log('```');
}
async function vizTimeline() {
    console.log('Generating Milestone Timeline...\n');
    const data = await graphql(`query { vizTimeline { type title mermaid } }`);
    console.log('```mermaid');
    console.log(data.vizTimeline.mermaid);
    console.log('```');
}
async function vizPriority() {
    console.log('Generating Priority Quadrant...\n');
    const data = await graphql(`query { vizPriority { type title mermaid } }`);
    console.log('```mermaid');
    console.log(data.vizPriority.mermaid);
    console.log('```');
}
async function vizKanban() {
    console.log('Generating Kanban Board...\n');
    const data = await graphql(`query { vizKanban { type title mermaid } }`);
    console.log('```mermaid');
    console.log(data.vizKanban.mermaid);
    console.log('```');
}
async function vizAgents() {
    console.log('Generating Agent Workload...\n');
    const data = await graphql(`query { vizAgents { type title mermaid } }`);
    console.log('```mermaid');
    console.log(data.vizAgents.mermaid);
    console.log('```');
}
async function vizIntent(intentId) {
    console.log('Generating Intent Flow...\n');
    const query = intentId
        ? `query { vizIntent(id: "${intentId}") { type title mermaid } }`
        : `query { vizIntent { type title mermaid } }`;
    const data = await graphql(query);
    console.log('```mermaid');
    console.log(data.vizIntent.mermaid);
    console.log('```');
}
async function vizAll() {
    console.log('# Summit Work Graph Visualizations\n');
    console.log('Generated at:', new Date().toISOString(), '\n');
    console.log('## Roadmap Overview\n');
    await vizRoadmap();
    console.log('\n---\n');
    console.log('## Sprint Progress\n');
    await vizSprint();
    console.log('\n---\n');
    console.log('## Milestone Timeline\n');
    await vizTimeline();
    console.log('\n---\n');
    console.log('## Kanban Board\n');
    await vizKanban();
    console.log('\n---\n');
    console.log('## Priority Matrix\n');
    await vizPriority();
    console.log('\n---\n');
    console.log('## Agent Workload\n');
    await vizAgents();
    console.log('\n---\n');
    console.log('## Dependency Graph\n');
    await vizDependencies();
    console.log('\n---\n');
    console.log('## Epic Breakdown\n');
    await vizEpic();
    console.log('\n---\n');
    console.log('## Intent Flow\n');
    await vizIntent();
}
// ============================================
// Stats Command
// ============================================
async function showStats() {
    const data = await graphql(`
    query {
      stats {
        totalNodes
        totalEdges
        nodesByType { type count }
      }
    }
  `);
    console.log('\n📊 Work Graph Statistics\n');
    console.log(`Total Nodes: ${data.stats.totalNodes}`);
    console.log(`Total Edges: ${data.stats.totalEdges}`);
    console.log('\nNodes by Type:');
    for (const { type, count } of data.stats.nodesByType) {
        console.log(`  ${type}: ${count}`);
    }
}
// ============================================
// Health Command
// ============================================
async function showHealth() {
    const data = await graphql(`
    query {
      healthScore {
        overall
        velocity
        quality
        predictability
        agentEfficiency
      }
    }
  `);
    console.log('\n🏥 Engineering Health Score\n');
    const h = data.healthScore;
    console.log(`Overall:        ${h.overall}%`);
    console.log(`Velocity:       ${h.velocity}%`);
    console.log(`Quality:        ${h.quality}%`);
    console.log(`Predictability: ${h.predictability}%`);
    console.log(`Agent Efficiency: ${h.agentEfficiency}%`);
}
// ============================================
// Query Commands
// ============================================
async function listTickets(status) {
    const query = status
        ? `query { tickets(status: "${status}") { id title status priority assignee } }`
        : `query { tickets { id title status priority assignee } }`;
    const data = await graphql(query);
    console.log('\n🎫 Tickets\n');
    for (const ticket of data.tickets) {
        const icon = { P0: '🔴', P1: '🟠', P2: '🟡', P3: '🟢' }[ticket.priority] || '⚪';
        const assignee = ticket.assignee ? `@${ticket.assignee}` : 'unassigned';
        console.log(`${icon} [${ticket.status}] ${ticket.title} (${assignee})`);
    }
}
async function listAgents() {
    const data = await graphql(`
    query { agents { id name agentType status completedTasks successRate } }
  `);
    console.log('\n🤖 Agents\n');
    for (const agent of data.agents) {
        const statusIcon = { available: '🟢', busy: '🟡', offline: '⚫', error: '🔴' }[agent.status] || '⚪';
        console.log(`${statusIcon} ${agent.name} (${agent.agentType}) - ${agent.completedTasks} tasks, ${agent.successRate.toFixed(1)}% success`);
    }
}
// ============================================
// Import Commands
// ============================================
async function handleImport(subCommand, pathArg) {
    // Dynamic import to avoid loading fs in browser environments
    const { runImport } = await Promise.resolve().then(() => __importStar(require('./import/backlog-importer.js')));
    const rootDir = pathArg || process.cwd();
    switch (subCommand) {
        case 'all': {
            console.log(`\n📥 Importing all backlogs from ${rootDir}...\n`);
            const result = await runImport(rootDir, true);
            console.log('\n📊 Import Summary:');
            console.log(`  Epics:      ${result.summary.totalEpics}`);
            console.log(`  Tickets:    ${result.summary.totalTickets}`);
            console.log(`  Milestones: ${result.summary.totalMilestones}`);
            console.log('\n  By Source:');
            for (const [source, count] of Object.entries(result.summary.bySource)) {
                console.log(`    ${source}: ${count} items`);
            }
            // Show sample data
            console.log('\n📋 Sample Epics:');
            for (const epic of result.epics.slice(0, 5)) {
                console.log(`  • ${epic.title} [${epic.status}]`);
            }
            console.log('\n🎫 Sample Tickets:');
            for (const ticket of result.tickets.slice(0, 5)) {
                const icon = { P0: '🔴', P1: '🟠', P2: '🟡', P3: '🟢' };
                console.log(`  ${icon[ticket.priority] || '⚪'} ${ticket.title}`);
            }
            console.log('\n🏁 Milestones:');
            for (const milestone of result.milestones) {
                const icon = { release: '🚀', checkpoint: '🏁', deadline: '⏰' };
                console.log(`  ${icon[milestone.milestoneType] || '📌'} ${milestone.name} - ${milestone.targetDate.toLocaleDateString()}`);
            }
            break;
        }
        case 'roadmap':
        case 'warroom':
        case 'tasks':
            console.log(`Import from specific file: ${pathArg}`);
            console.log('Use "import all" to import from a directory containing all backlog files.');
            break;
        default:
            console.error('Unknown import subcommand. Use: all, roadmap, warroom, or tasks');
    }
}
// ============================================
// Help
// ============================================
function showHelp() {
    console.log(`
Summit Work Graph CLI

Usage: work-graph <command> [options]

Commands:
  stats                 Show graph statistics
  health                Show engineering health score
  tickets [status]      List tickets (optionally filter by status)
  agents                List agents

Visualization Commands:
  viz roadmap           Roadmap Gantt chart with milestones and epics
  viz sprint [number]   Sprint Gantt chart with tickets
  viz deps              Dependency flowchart for tickets/epics
  viz epic [id]         Epic breakdown showing ticket status
  viz timeline          Milestone timeline diagram
  viz priority          Priority vs complexity quadrant chart
  viz kanban            Kanban board visualization
  viz agents            Agent workload pie chart
  viz intent [id]       Intent-to-delivery flow diagram
  viz all               Generate all visualizations

Import Commands:
  import all [dir]      Import all backlogs from directory
  import roadmap <file> Import from ROADMAP.md format
  import warroom <file> Import from 90_DAY_WAR_ROOM_BACKLOG.md format
  import tasks <file>   Import from TASK_BACKLOG.md format

Options:
  --help, -h            Show this help message
  --url URL             GraphQL server URL (default: http://localhost:4000/graphql)

Examples:
  work-graph stats
  work-graph health
  work-graph tickets in_progress
  work-graph viz roadmap
  work-graph viz sprint 47
  work-graph viz epic abc123
  work-graph viz all > report.md
  work-graph import all /path/to/summit

Environment Variables:
  WORK_GRAPH_URL        GraphQL server URL
`);
}
// ============================================
// Main
// ============================================
async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        showHelp();
        return;
    }
    const command = args[0];
    const subCommand = args[1];
    const arg = args[2];
    try {
        switch (command) {
            case 'stats':
                await showStats();
                break;
            case 'health':
                await showHealth();
                break;
            case 'tickets':
                await listTickets(subCommand);
                break;
            case 'agents':
                await listAgents();
                break;
            case 'import':
                await handleImport(subCommand, arg);
                break;
            case 'viz':
                switch (subCommand) {
                    case 'roadmap':
                        await vizRoadmap();
                        break;
                    case 'sprint':
                        await vizSprint(arg);
                        break;
                    case 'deps':
                    case 'dependencies':
                        await vizDependencies();
                        break;
                    case 'epic':
                        await vizEpic(arg);
                        break;
                    case 'timeline':
                        await vizTimeline();
                        break;
                    case 'priority':
                    case 'quadrant':
                        await vizPriority();
                        break;
                    case 'kanban':
                    case 'board':
                        await vizKanban();
                        break;
                    case 'agents':
                    case 'workload':
                        await vizAgents();
                        break;
                    case 'intent':
                    case 'flow':
                        await vizIntent(arg);
                        break;
                    case 'all':
                        await vizAll();
                        break;
                    default:
                        console.error(`Unknown visualization: ${subCommand}`);
                        showHelp();
                }
                break;
            default:
                console.error(`Unknown command: ${command}`);
                showHelp();
        }
    }
    catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
    }
}
main();
