/**
 * Summit Work Graph - GraphQL API
 */

import { createSchema, createYoga } from 'graphql-yoga';
import type { WorkGraphNode, Ticket, PR, Agent, Commitment, Sprint } from '../schema/nodes.js';
import type { WorkGraphEdge } from '../schema/edges.js';

export interface GraphStore {
  getNode<T>(id: string): Promise<T | null>;
  getNodes<T>(filter?: Partial<T>): Promise<T[]>;
  createNode<T>(node: T): Promise<T>;
  updateNode<T>(id: string, updates: Partial<T>): Promise<T | null>;
  deleteNode(id: string): Promise<boolean>;
  createEdge(edge: WorkGraphEdge): Promise<WorkGraphEdge>;
  getEdges(filter?: { sourceId?: string; targetId?: string; type?: string }): Promise<WorkGraphEdge[]>;
  deleteEdge(id: string): Promise<boolean>;
}

const typeDefs = /* GraphQL */ String.raw`
  scalar DateTime
  scalar JSON

  type Query {
    node(id: ID!): Node
    nodes(type: String, status: String, limit: Int, offset: Int): [Node!]!
    tickets(status: String, priority: String, assignee: String, sprintId: ID): [Ticket!]!
    prs(status: String, author: String): [PR!]!
    agents(status: String, agentType: String): [Agent!]!
    commitments(status: String, customer: String): [Commitment!]!
    sprints(status: String): [Sprint!]!
    edges(sourceId: ID, targetId: ID, type: String): [Edge!]!
    healthScore: HealthScore!
  }

  type Mutation {
    createTicket(input: CreateTicketInput!): Ticket!
    updateTicket(id: ID!, input: UpdateTicketInput!): Ticket
    deleteNode(id: ID!): Boolean!
    assignTicket(ticketId: ID!, assigneeId: ID!): Ticket
    createEdge(input: CreateEdgeInput!): Edge!
    deleteEdge(id: ID!): Boolean!
    triageTicket(ticketId: ID!): TriageResult!
  }

  type Subscription {
    nodeUpdated(type: String): Node!
    ticketAssigned: Ticket!
    commitmentAtRisk: Commitment!
  }

  interface Node {
    id: ID!
    type: String!
    createdAt: DateTime!
    updatedAt: DateTime!
    createdBy: String!
    metadata: JSON
  }

  type Ticket implements Node {
    id: ID!
    type: String!
    createdAt: DateTime!
    updatedAt: DateTime!
    createdBy: String!
    metadata: JSON
    title: String!
    description: String!
    status: String!
    priority: String!
    estimate: Float
    assignee: String
    assigneeType: String
    labels: [String!]!
    dueDate: DateTime
    linearId: String
    jiraKey: String
    sprintId: ID
    agentEligible: Boolean!
    complexity: String!
    area: String
    blockedReason: String
    completedAt: DateTime
    relatedPRs: [PR!]!
    blockedBy: [Ticket!]!
  }

  type PR implements Node {
    id: ID!
    type: String!
    createdAt: DateTime!
    updatedAt: DateTime!
    createdBy: String!
    metadata: JSON
    title: String!
    description: String!
    url: String!
    number: Int!
    author: String!
    authorType: String!
    status: String!
    checksStatus: String!
    reviewers: [String!]!
    additions: Int!
    deletions: Int!
    filesChanged: Int!
    branch: String!
    mergedAt: DateTime
    linkedTickets: [Ticket!]!
  }

  type Agent implements Node {
    id: ID!
    type: String!
    createdAt: DateTime!
    updatedAt: DateTime!
    createdBy: String!
    metadata: JSON
    name: String!
    agentType: String!
    status: String!
    capabilities: [String!]!
    currentTask: String
    completedTasks: Int!
    successRate: Float!
    averageCompletionTime: Float
    reputation: Float!
    lastActive: DateTime
    model: String
    version: String
  }

  type Commitment implements Node {
    id: ID!
    type: String!
    createdAt: DateTime!
    updatedAt: DateTime!
    createdBy: String!
    metadata: JSON
    title: String!
    description: String!
    customer: String!
    dueDate: DateTime!
    status: String!
    confidence: Float!
    contractualSLA: Boolean!
    linkedTickets: [Ticket!]!
  }

  type Sprint implements Node {
    id: ID!
    type: String!
    createdAt: DateTime!
    updatedAt: DateTime!
    createdBy: String!
    metadata: JSON
    name: String!
    number: Int!
    status: String!
    startDate: DateTime!
    endDate: DateTime!
    goal: String
    capacity: Float
    committed: Float!
    completed: Float!
    velocity: Float
    team: String
    tickets: [Ticket!]!
  }

  type Edge {
    id: ID!
    type: String!
    sourceId: ID!
    targetId: ID!
    createdAt: DateTime!
    createdBy: String!
    weight: Float!
    metadata: JSON
    source: Node
    target: Node
  }

  type HealthScore {
    overall: Float!
    velocity: Float!
    quality: Float!
    predictability: Float!
    agentEfficiency: Float!
    alerts: [Alert!]!
  }

  type Alert {
    severity: String!
    message: String!
    timestamp: DateTime!
  }

  type TriageResult {
    priority: String!
    type: String!
    area: String!
    complexity: String!
    estimate: Float!
    agentEligible: Boolean!
    confidence: Float!
    reasoning: [String!]!
    suggestedLabels: [String!]!
    riskScore: Float!
  }

  input CreateTicketInput {
    title: String!
    description: String!
    priority: String
    status: String
    labels: [String!]
    assignee: String
    estimate: Float
    sprintId: ID
  }

  input UpdateTicketInput {
    title: String
    description: String
    priority: String
    status: String
    labels: [String!]
    assignee: String
    estimate: Float
    blockedReason: String
  }

  input CreateEdgeInput {
    type: String!
    sourceId: ID!
    targetId: ID!
    weight: Float
    metadata: JSON
  }
`;

export function createWorkGraphAPI(graphStore: GraphStore) {
  const resolvers = {
    Query: {
      node: async (_: unknown, { id }: { id: string }) => graphStore.getNode(id),
      nodes: async (_: unknown, { type, status, limit, offset }: { type?: string; status?: string; limit?: number; offset?: number }) => {
        const filter: Record<string, unknown> = {};
        if (type) filter.type = type;
        if (status) filter.status = status;
        let results = await graphStore.getNodes(filter as Partial<WorkGraphNode>);
        if (offset) results = results.slice(offset);
        if (limit) results = results.slice(0, limit);
        return results;
      },
      tickets: async (_: unknown, args: { status?: string; priority?: string; assignee?: string; sprintId?: string }) => {
        const filter: Partial<Ticket> = { type: 'ticket' };
        if (args.status) filter.status = args.status as Ticket['status'];
        if (args.priority) filter.priority = args.priority as Ticket['priority'];
        if (args.assignee) filter.assignee = args.assignee;
        if (args.sprintId) filter.sprintId = args.sprintId;
        return graphStore.getNodes<Ticket>(filter);
      },
      prs: async (_: unknown, args: { status?: string; author?: string }) => {
        const filter: Partial<PR> = { type: 'pr' };
        if (args.status) filter.status = args.status as PR['status'];
        if (args.author) filter.author = args.author;
        return graphStore.getNodes<PR>(filter);
      },
      agents: async (_: unknown, args: { status?: string; agentType?: string }) => {
        const filter: Partial<Agent> = { type: 'agent' };
        if (args.status) filter.status = args.status as Agent['status'];
        if (args.agentType) filter.agentType = args.agentType as Agent['agentType'];
        return graphStore.getNodes<Agent>(filter);
      },
      commitments: async (_: unknown, args: { status?: string; customer?: string }) => {
        const filter: Partial<Commitment> = { type: 'commitment' };
        if (args.status) filter.status = args.status as Commitment['status'];
        if (args.customer) filter.customer = args.customer;
        return graphStore.getNodes<Commitment>(filter);
      },
      sprints: async (_: unknown, args: { status?: string }) => {
        const filter: Partial<Sprint> = { type: 'sprint' };
        if (args.status) filter.status = args.status as Sprint['status'];
        return graphStore.getNodes<Sprint>(filter);
      },
      edges: async (_: unknown, args: { sourceId?: string; targetId?: string; type?: string }) => {
        return graphStore.getEdges(args);
      },
      healthScore: () => ({ overall: 75, velocity: 80, quality: 70, predictability: 75, agentEfficiency: 85, alerts: [] }),
    },
    Mutation: {
      createTicket: async (_: unknown, { input }: { input: Partial<Ticket> }) => {
        const ticket: Ticket = {
          id: crypto.randomUUID(),
          type: 'ticket',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'api',
          title: input.title || '',
          description: input.description || '',
          status: (input.status as Ticket['status']) || 'backlog',
          priority: (input.priority as Ticket['priority']) || 'P2',
          labels: input.labels || [],
          agentEligible: false,
          complexity: 'unknown',
          ...input,
        };
        return graphStore.createNode(ticket);
      },
      updateTicket: async (_: unknown, { id, input }: { id: string; input: Partial<Ticket> }) => {
        return graphStore.updateNode<Ticket>(id, input);
      },
      deleteNode: async (_: unknown, { id }: { id: string }) => graphStore.deleteNode(id),
      assignTicket: async (_: unknown, { ticketId, assigneeId }: { ticketId: string; assigneeId: string }) => {
        return graphStore.updateNode<Ticket>(ticketId, { assignee: assigneeId });
      },
      createEdge: async (_: unknown, { input }: { input: Partial<WorkGraphEdge> }) => {
        const edge: WorkGraphEdge = {
          id: crypto.randomUUID(),
          type: input.type as WorkGraphEdge['type'],
          sourceId: input.sourceId!,
          targetId: input.targetId!,
          createdAt: new Date(),
          createdBy: 'api',
          weight: input.weight || 1,
          metadata: input.metadata,
        };
        return graphStore.createEdge(edge);
      },
      deleteEdge: async (_: unknown, { id }: { id: string }) => graphStore.deleteEdge(id),
      triageTicket: () => ({
        priority: 'P2', type: 'task', area: 'general', complexity: 'medium',
        estimate: 3, agentEligible: true, confidence: 75, reasoning: [], suggestedLabels: [], riskScore: 25,
      }),
    },
    Ticket: {
      relatedPRs: async (ticket: Ticket) => {
        const edges = await graphStore.getEdges({ targetId: ticket.id, type: 'implements' });
        const prs = await Promise.all(edges.map(e => graphStore.getNode<PR>(e.sourceId)));
        return prs.filter((p): p is PR => p !== null && p.type === 'pr');
      },
      blockedBy: async (ticket: Ticket) => {
        const edges = await graphStore.getEdges({ sourceId: ticket.id, type: 'blocked_by' });
        const tickets = await Promise.all(edges.map(e => graphStore.getNode<Ticket>(e.targetId)));
        return tickets.filter((t): t is Ticket => t !== null);
      },
    },
    PR: {
      linkedTickets: async (pr: PR) => {
        const edges = await graphStore.getEdges({ sourceId: pr.id, type: 'implements' });
        const tickets = await Promise.all(edges.map(e => graphStore.getNode<Ticket>(e.targetId)));
        return tickets.filter((t): t is Ticket => t !== null);
      },
    },
    Edge: {
      source: async (edge: WorkGraphEdge) => graphStore.getNode(edge.sourceId),
      target: async (edge: WorkGraphEdge) => graphStore.getNode(edge.targetId),
    },
    Node: {
      __resolveType: (node: WorkGraphNode) => {
        const typeMap: Record<string, string> = {
          ticket: 'Ticket', pr: 'PR', agent: 'Agent', commitment: 'Commitment', sprint: 'Sprint',
        };
        return typeMap[node.type] || 'Ticket';
      },
    },
  };

  const schema = createSchema({ typeDefs, resolvers });
  return createYoga({ schema, graphqlEndpoint: '/graphql' });
}
