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

// prettier-ignore
const typeDefs = /* GraphQL */ `
scalar DateTime
scalar JSON

type Query {
  node(id: ID!): Node
  nodes(type: String, status: String, limit: Int): [Node!]!
  tickets(status: String, priority: String, assignee: String): [Ticket!]!
  prs(status: String, author: String): [PR!]!
  agents(status: String): [Agent!]!
  commitments(status: String): [Commitment!]!
  sprints(status: String): [Sprint!]!
  edges(sourceId: ID, targetId: ID, type: String): [Edge!]!
  healthScore: HealthScore!
  stats: GraphStats!
}

type Mutation {
  createTicket(input: CreateTicketInput!): Ticket!
  updateTicket(id: ID!, input: UpdateTicketInput!): Ticket
  deleteNode(id: ID!): Boolean!
  assignTicket(ticketId: ID!, assigneeId: ID!): Ticket
  createEdge(input: CreateEdgeInput!): Edge!
  deleteEdge(id: ID!): Boolean!
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
  labels: [String!]!
  linearId: String
  jiraKey: String
  agentEligible: Boolean!
  complexity: String!
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
  completedTasks: Int!
  successRate: Float!
  reputation: Float!
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
  committed: Float!
  completed: Float!
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

type GraphStats {
  totalNodes: Int!
  totalEdges: Int!
  nodesByType: [NodeTypeCount!]!
}

type NodeTypeCount {
  type: String!
  count: Int!
}

input CreateTicketInput {
  title: String!
  description: String!
  priority: String
  status: String
  labels: [String!]
  assignee: String
  estimate: Float
}

input UpdateTicketInput {
  title: String
  description: String
  priority: String
  status: String
  labels: [String!]
  assignee: String
  estimate: Float
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
      node: (_: unknown, { id }: { id: string }) => graphStore.getNode(id),
      nodes: async (_: unknown, { type, status, limit }: { type?: string; status?: string; limit?: number }) => {
        const filter: Record<string, unknown> = {};
        if (type) {filter.type = type;}
        if (status) {filter.status = status;}
        let results = await graphStore.getNodes(filter as Record<string, unknown>);
        if (limit) {results = results.slice(0, limit);}
        return results;
      },
      tickets: (_: unknown, args: { status?: string; priority?: string; assignee?: string }) => {
        const filter: Partial<Ticket> = { type: 'ticket' };
        if (args.status) {filter.status = args.status as Ticket['status'];}
        if (args.priority) {filter.priority = args.priority as Ticket['priority'];}
        if (args.assignee) {filter.assignee = args.assignee;}
        return graphStore.getNodes<Ticket>(filter);
      },
      prs: (_: unknown, args: { status?: string; author?: string }) => {
        const filter: Partial<PR> = { type: 'pr' };
        if (args.status) {filter.status = args.status as PR['status'];}
        if (args.author) {filter.author = args.author;}
        return graphStore.getNodes<PR>(filter);
      },
      agents: (_: unknown, args: { status?: string }) => {
        const filter: Partial<Agent> = { type: 'agent' };
        if (args.status) {filter.status = args.status as Agent['status'];}
        return graphStore.getNodes<Agent>(filter);
      },
      commitments: (_: unknown, args: { status?: string }) => {
        const filter: Partial<Commitment> = { type: 'commitment' };
        if (args.status) {filter.status = args.status as Commitment['status'];}
        return graphStore.getNodes<Commitment>(filter);
      },
      sprints: (_: unknown, args: { status?: string }) => {
        const filter: Partial<Sprint> = { type: 'sprint' };
        if (args.status) {filter.status = args.status as Sprint['status'];}
        return graphStore.getNodes<Sprint>(filter);
      },
      edges: (_: unknown, args: { sourceId?: string; targetId?: string; type?: string }) => graphStore.getEdges(args),
      healthScore: () => ({ overall: 75, velocity: 80, quality: 70, predictability: 75, agentEfficiency: 85, alerts: [] }),
      stats: async () => {
        const allNodes = await graphStore.getNodes({});
        const allEdges = await graphStore.getEdges({});
        const typeCountMap = new Map<string, number>();
        for (const node of allNodes) {
          const nodeType = (node as { type?: string }).type || 'unknown';
          typeCountMap.set(nodeType, (typeCountMap.get(nodeType) || 0) + 1);
        }
        const nodesByType = Array.from(typeCountMap.entries())
          .map(([type, count]) => ({ type, count }))
          .sort((a, b) => b.count - a.count);
        return { totalNodes: allNodes.length, totalEdges: allEdges.length, nodesByType };
      },
    },
    Mutation: {
      createTicket: (_: unknown, { input }: { input: Partial<Ticket> }) => {
        const ticket: Ticket = {
          id: crypto.randomUUID(), type: 'ticket', createdAt: new Date(), updatedAt: new Date(), createdBy: 'api',
          title: input.title || '', description: input.description || '', status: (input.status as Ticket['status']) || 'backlog',
          priority: (input.priority as Ticket['priority']) || 'P2', ticketType: (input.ticketType as Ticket['ticketType']) || 'unknown',
          labels: input.labels || [], agentEligible: false, complexity: 'unknown', ...input,
        };
        return graphStore.createNode(ticket);
      },
      updateTicket: (_: unknown, { id, input }: { id: string; input: Partial<Ticket> }) => graphStore.updateNode<Ticket>(id, input),
      deleteNode: (_: unknown, { id }: { id: string }) => graphStore.deleteNode(id),
      assignTicket: (_: unknown, { ticketId, assigneeId }: { ticketId: string; assigneeId: string }) => graphStore.updateNode<Ticket>(ticketId, { assignee: assigneeId }),
      createEdge: (_: unknown, { input }: { input: Partial<WorkGraphEdge> }) => {
        if (!input.sourceId || !input.targetId) {
          throw new Error('sourceId and targetId are required');
        }
        const edge: WorkGraphEdge = {
          id: crypto.randomUUID(), type: input.type as WorkGraphEdge['type'], sourceId: input.sourceId, targetId: input.targetId,
          createdAt: new Date(), createdBy: 'api', weight: input.weight || 1, metadata: input.metadata,
        };
        return graphStore.createEdge(edge);
      },
      deleteEdge: (_: unknown, { id }: { id: string }) => graphStore.deleteEdge(id),
    },
    Node: {
      __resolveType: (node: WorkGraphNode) => {
        const typeMap: Record<string, string> = {
          ticket: 'Ticket', pr: 'PR', agent: 'Agent', commitment: 'Commitment', sprint: 'Sprint',
          intent: 'Ticket', hypothesis: 'Ticket', epic: 'Ticket', test: 'Ticket', scan: 'Ticket',
          incident: 'Ticket', customer: 'Ticket', environment: 'Ticket', policy: 'Ticket'
        };
        return typeMap[node.type] || 'Ticket';
      }
    },
  };

  const schema = createSchema({ typeDefs, resolvers });
  return createYoga({ schema, graphqlEndpoint: '/graphql' });
}
