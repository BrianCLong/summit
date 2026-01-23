/**
 * Summit Work Graph - GraphQL Server
 *
 * Starts a GraphQL server with playground for interactive queries.
 */

import { createServer } from 'node:http';
import { createWorkGraphAPI } from './api/graphql.js';
import { InMemoryGraphStore } from './store/neo4j.js';
import { EventBus } from './events/bus.js';
import { PlannerOrchestrator } from './planner/orchestrator.js';
import { WorkMarket } from './agents/market.js';
import { PolicyEngine } from './policy/engine.js';
import { PortfolioSimulator } from './portfolio/simulator.js';
import { MetricsDashboard } from './metrics/dashboard.js';
import { AutoTriageEngine } from './triage/auto-triage.js';
import type { Intent, Ticket, Agent, Commitment, Epic, Sprint, Board, Roadmap, Milestone } from './schema/nodes.js';

const PORT = process.env.PORT || 4000;

async function seedData(graphStore: InMemoryGraphStore) {
  console.log('🌱 Seeding demo data...');

  // Create Sprints
  const currentSprint: Sprint = await graphStore.createNode({
    id: crypto.randomUUID(),
    type: 'sprint',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    name: 'Sprint 47',
    number: 47,
    status: 'active',
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    goal: 'Deliver real-time collaboration MVP',
    capacity: 40,
    committed: 35,
    completed: 18,
  });

  // Create Agents
  const agentDefs = [
    { name: 'Claude-Alpha', agentType: 'coding' as const, capabilities: ['typescript', 'react', 'graphql', 'node'], successRate: 94 },
    { name: 'Claude-Beta', agentType: 'coding' as const, capabilities: ['python', 'fastapi', 'postgresql', 'redis'], successRate: 91 },
    { name: 'Claude-Gamma', agentType: 'testing' as const, capabilities: ['jest', 'playwright', 'k6', 'coverage'], successRate: 97 },
    { name: 'Claude-Delta', agentType: 'security' as const, capabilities: ['sast', 'dast', 'dependency-scan', 'secrets'], successRate: 99 },
    { name: 'Claude-Review', agentType: 'review' as const, capabilities: ['code-review', 'architecture', 'best-practices'], successRate: 88 },
  ];

  const agents: Agent[] = [];
  for (const def of agentDefs) {
    const agent = await graphStore.createNode<Agent>({
      id: crypto.randomUUID(),
      type: 'agent',
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
      createdBy: 'system',
      name: def.name,
      agentType: def.agentType,
      status: Math.random() > 0.3 ? 'available' : 'busy',
      capabilities: def.capabilities,
      completedTasks: Math.floor(Math.random() * 100) + 20,
      successRate: def.successRate,
      reputation: 60 + Math.random() * 40,
      currentLoad: Math.floor(Math.random() * 5),
      capacityUnits: 10,
      qualityScore: 75 + Math.random() * 25,
    });
    agents.push(agent);
  }

  // Create Intents
  const intents: Intent[] = [];
  const intentDefs = [
    { title: 'Real-time Collaboration', source: 'customer' as const, priority: 'P1' as const, customer: 'Acme Corp' },
    { title: 'Advanced Analytics Dashboard', source: 'internal' as const, priority: 'P2' as const },
    { title: 'GDPR Compliance Updates', source: 'regulation' as const, priority: 'P0' as const },
    { title: 'Mobile App Redesign', source: 'market' as const, priority: 'P2' as const },
  ];

  for (const def of intentDefs) {
    const intent = await graphStore.createNode<Intent>({
      id: crypto.randomUUID(),
      type: 'intent',
      createdAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
      createdBy: 'product-team',
      title: def.title,
      description: `Strategic initiative: ${def.title}`,
      source: def.source,
      customer: def.customer,
      priority: def.priority,
      status: 'validated',
      evidence: ['Customer interviews', 'Market research'],
    });
    intents.push(intent);
  }

  // Create Epics
  const epics: Epic[] = [];
  const epicDefs = [
    { title: 'WebSocket Infrastructure', intent: intents[0] },
    { title: 'Presence System', intent: intents[0] },
    { title: 'Collaborative Cursors', intent: intents[0] },
    { title: 'Analytics Backend', intent: intents[1] },
    { title: 'Data Privacy Controls', intent: intents[2] },
  ];

  for (const def of epicDefs) {
    const epic = await graphStore.createNode<Epic>({
      id: crypto.randomUUID(),
      type: 'epic',
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
      createdBy: 'engineering',
      title: def.title,
      description: `Epic for ${def.title}`,
      status: Math.random() > 0.5 ? 'in_progress' : 'planned',
      progress: Math.floor(Math.random() * 80),
    });
    epics.push(epic);

    // Link epic to intent
    await graphStore.createEdge({
      id: crypto.randomUUID(),
      type: 'realizes',
      sourceId: epic.id,
      targetId: def.intent.id,
      createdAt: new Date(),
      createdBy: 'system',
      weight: 1,
    });
  }

  // Create Tickets
  const ticketDefs = [
    { title: 'Set up WebSocket server with Socket.io', epic: epics[0], status: 'done' as const, assignee: agents[0].name },
    { title: 'Implement connection pooling', epic: epics[0], status: 'done' as const, assignee: agents[0].name },
    { title: 'Add reconnection logic with exponential backoff', epic: epics[0], status: 'in_progress' as const, assignee: agents[0].name },
    { title: 'Create presence heartbeat system', epic: epics[1], status: 'in_progress' as const, assignee: agents[1].name },
    { title: 'Build user status API', epic: epics[1], status: 'ready' as const },
    { title: 'Implement cursor position sync', epic: epics[2], status: 'backlog' as const },
    { title: 'Add cursor color assignment', epic: epics[2], status: 'backlog' as const },
    { title: 'Build analytics data pipeline', epic: epics[3], status: 'in_progress' as const, assignee: agents[1].name },
    { title: 'Create dashboard widgets', epic: epics[3], status: 'ready' as const },
    { title: 'Implement data retention policies', epic: epics[4], status: 'done' as const, assignee: agents[0].name },
    { title: 'Add consent management', epic: epics[4], status: 'in_progress' as const, assignee: agents[1].name },
    { title: 'Create data export API', epic: epics[4], status: 'backlog' as const },
  ];

  const tickets: Ticket[] = [];
  for (const def of ticketDefs) {
    const ticket = await graphStore.createNode<Ticket>({
      id: crypto.randomUUID(),
      type: 'ticket',
      createdAt: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
      createdBy: 'engineering',
      title: def.title,
      description: `Implementation task: ${def.title}`,
      status: def.status,
      priority: Math.random() > 0.7 ? 'P1' : 'P2',
      ticketType: 'feature',
      estimate: Math.floor(Math.random() * 5) + 1,
      assignee: def.assignee,
      assigneeType: def.assignee ? 'agent' : undefined,
      labels: ['sprint-47'],
      agentEligible: true,
      complexity: Math.random() > 0.5 ? 'medium' : 'simple',
      sprintId: currentSprint.id,
    });
    tickets.push(ticket);

    // Link ticket to epic
    await graphStore.createEdge({
      id: crypto.randomUUID(),
      type: 'implements',
      sourceId: ticket.id,
      targetId: def.epic.id,
      createdAt: new Date(),
      createdBy: 'system',
      weight: 1,
    });
  }

  // Create Commitments
  const commitments: Commitment[] = [];
  const commitmentDefs = [
    { title: 'Real-time Collaboration MVP', customer: 'Acme Corp', daysOut: 30, confidence: 78, status: 'active' as const },
    { title: 'GDPR Compliance Deadline', customer: 'Legal/Compliance', daysOut: 45, confidence: 92, status: 'active' as const },
    { title: 'Q1 Analytics Release', customer: 'Product Team', daysOut: 60, confidence: 65, status: 'at_risk' as const },
  ];

  for (const def of commitmentDefs) {
    const commitment = await graphStore.createNode<Commitment>({
      id: crypto.randomUUID(),
      type: 'commitment',
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
      createdBy: 'sales',
      title: def.title,
      description: `Customer commitment: ${def.title}`,
      customer: def.customer,
      promisedTo: def.customer,
      dueDate: new Date(Date.now() + def.daysOut * 24 * 60 * 60 * 1000),
      status: def.status,
      confidence: def.confidence,
      contractualSLA: def.customer === 'Acme Corp',
      escalationPath: ['eng-lead', 'vp-eng', 'cto'],
      linkedIntents: [],
    });
    commitments.push(commitment);
  }

  // Link tickets to commitments
  for (let i = 0; i < 6; i++) {
    await graphStore.createEdge({
      id: crypto.randomUUID(),
      type: 'drives',
      sourceId: tickets[i].id,
      targetId: commitments[0].id,
      createdAt: new Date(),
      createdBy: 'system',
      weight: 1,
    });
  }

  // Create Boards
  const productBacklog = await graphStore.createNode<Board>({
    id: crypto.randomUUID(),
    type: 'board',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    name: 'Product Backlog',
    boardType: 'kanban',
    columns: [
      { id: '1', name: 'Icebox', position: 0 },
      { id: '2', name: 'Backlog', position: 1 },
      { id: '3', name: 'Ready', position: 2, wipLimit: 10 },
      { id: '4', name: 'In Progress', position: 3, wipLimit: 5 },
      { id: '5', name: 'Review', position: 4, wipLimit: 3 },
      { id: '6', name: 'Done', position: 5 },
    ],
    isDefault: true,
    archived: false,
    itemCount: tickets.length,
  });

  const sprintBoard = await graphStore.createNode<Board>({
    id: crypto.randomUUID(),
    type: 'board',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    name: 'Sprint 47 Board',
    boardType: 'scrum',
    columns: [
      { id: '1', name: 'To Do', position: 0 },
      { id: '2', name: 'Doing', position: 1, wipLimit: 3 },
      { id: '3', name: 'Testing', position: 2 },
      { id: '4', name: 'Done', position: 3 },
    ],
    team: 'Platform Team',
    isDefault: false,
    archived: false,
    itemCount: 8,
  });

  // Link tickets to board
  for (const ticket of tickets) {
    await graphStore.createEdge({
      id: crypto.randomUUID(),
      type: 'displayed_on',
      sourceId: ticket.id,
      targetId: productBacklog.id,
      createdAt: new Date(),
      createdBy: 'system',
      weight: 1,
    });
  }

  // Create Roadmap
  const roadmap2026 = await graphStore.createNode<Roadmap>({
    id: crypto.randomUUID(),
    type: 'roadmap',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'product-team',
    name: 'Summit 2026 Roadmap',
    description: 'Product roadmap for 2026',
    timeframe: {
      start: new Date('2026-01-01'),
      end: new Date('2026-12-31'),
      granularity: 'quarter',
    },
    swimlanes: [
      { id: 'platform', name: 'Platform', position: 0, color: '#3B82F6' },
      { id: 'security', name: 'Security', position: 1, color: '#EF4444' },
      { id: 'features', name: 'Features', position: 2, color: '#10B981' },
      { id: 'operations', name: 'Operations', position: 3, color: '#F59E0B' },
    ],
    status: 'active',
    visibility: 'team',
  });

  // Link epics to roadmap
  for (const epic of epics) {
    await graphStore.createEdge({
      id: crypto.randomUUID(),
      type: 'scheduled_on',
      sourceId: epic.id,
      targetId: roadmap2026.id,
      createdAt: new Date(),
      createdBy: 'system',
      weight: 1,
    });
  }

  // Create Milestones
  const milestones: Milestone[] = [];
  const milestoneDefs = [
    { name: 'MVP 4 GA', targetDate: new Date('2026-02-28'), milestoneType: 'release' as const, progress: 65 },
    { name: 'Security Audit Complete', targetDate: new Date('2026-03-15'), milestoneType: 'checkpoint' as const, progress: 30 },
    { name: 'Q1 Demo Day', targetDate: new Date('2026-03-31'), milestoneType: 'event' as const, progress: 0 },
    { name: 'Performance Targets Met', targetDate: new Date('2026-04-30'), milestoneType: 'checkpoint' as const, progress: 15 },
  ];

  for (const def of milestoneDefs) {
    const milestone = await graphStore.createNode<Milestone>({
      id: crypto.randomUUID(),
      type: 'milestone',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'product-team',
      name: def.name,
      targetDate: def.targetDate,
      milestoneType: def.milestoneType,
      status: def.progress > 50 ? 'on_track' : 'planned',
      progress: def.progress,
      successCriteria: [
        { id: crypto.randomUUID(), description: 'All critical bugs fixed', met: def.progress > 50 },
        { id: crypto.randomUUID(), description: 'Documentation complete', met: false },
      ],
      stakeholders: ['product-team', 'engineering'],
      linkedRoadmapId: roadmap2026.id,
    });
    milestones.push(milestone);

    // Link milestone to roadmap
    await graphStore.createEdge({
      id: crypto.randomUUID(),
      type: 'milestone_for',
      sourceId: milestone.id,
      targetId: roadmap2026.id,
      createdAt: new Date(),
      createdBy: 'system',
      weight: 1,
    });
  }

  // Link some tickets to milestones
  for (let i = 0; i < 4; i++) {
    await graphStore.createEdge({
      id: crypto.randomUUID(),
      type: 'targets',
      sourceId: tickets[i].id,
      targetId: milestones[0].id,
      createdAt: new Date(),
      createdBy: 'system',
      weight: 1,
    });
  }

  console.log(`   ✓ Created ${agents.length} agents`);
  console.log(`   ✓ Created 2 boards`);
  console.log(`   ✓ Created 1 roadmap`);
  console.log(`   ✓ Created ${milestones.length} milestones`);
  console.log(`   ✓ Created ${intents.length} intents`);
  console.log(`   ✓ Created ${epics.length} epics`);
  console.log(`   ✓ Created ${tickets.length} tickets`);
  console.log(`   ✓ Created ${commitments.length} commitments`);
  console.log(`   ✓ Created 1 active sprint`);

  return {
    agents,
    intents,
    epics,
    tickets,
    commitments,
    currentSprint,
    boards: [productBacklog, sprintBoard],
    roadmaps: [roadmap2026],
    milestones,
  };
}

async function main() {
  console.log('🚀 Starting Summit Work Graph Server\n');

  // Initialize stores
  const graphStore = new InMemoryGraphStore();
  const eventBus = new EventBus();

  // Initialize services
  const planner = new PlannerOrchestrator(graphStore);
  const market = new WorkMarket(graphStore);
  const policyEngine = new PolicyEngine(graphStore);
  const simulator = new PortfolioSimulator(graphStore);
  const metrics = new MetricsDashboard(graphStore);
  const triage = new AutoTriageEngine(graphStore);

  // Seed demo data
  await seedData(graphStore);

  // Create GraphQL API
  const yoga = createWorkGraphAPI(graphStore);

  // Create HTTP server
  const server = createServer(yoga);

  server.listen(PORT, () => {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🌐 GraphQL Server running at http://localhost:${PORT}/graphql`);
    console.log(`${'='.repeat(50)}\n`);
    console.log('Try these queries:\n');
    console.log(`  # Get all tickets
  query {
    tickets {
      id
      title
      status
      priority
      assignee
    }
  }

  # Get agents
  query {
    agents {
      id
      name
      status
      successRate
      completedTasks
    }
  }

  # Get commitments
  query {
    commitments {
      id
      title
      customer
      dueDate
      confidence
      status
    }
  }

  # Create a new ticket
  mutation {
    createTicket(input: {
      title: "Fix login bug"
      description: "Users cannot log in with SSO"
      priority: "P1"
      status: "backlog"
    }) {
      id
      title
      status
    }
  }
`);
  });
}

main().catch(console.error);
