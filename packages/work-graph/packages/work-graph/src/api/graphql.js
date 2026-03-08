"use strict";
/**
 * Summit Work Graph - GraphQL API
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWorkGraphAPI = createWorkGraphAPI;
const graphql_yoga_1 = require("graphql-yoga");
const typeDefs = /* GraphQL */ String.raw `
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
function createWorkGraphAPI(graphStore) {
    const resolvers = {
        Query: {
            node: async (_, { id }) => graphStore.getNode(id),
            nodes: async (_, { type, status, limit, offset }) => {
                const filter = {};
                if (type)
                    filter.type = type;
                if (status)
                    filter.status = status;
                let results = await graphStore.getNodes(filter);
                if (offset)
                    results = results.slice(offset);
                if (limit)
                    results = results.slice(0, limit);
                return results;
            },
            tickets: async (_, args) => {
                const filter = { type: 'ticket' };
                if (args.status)
                    filter.status = args.status;
                if (args.priority)
                    filter.priority = args.priority;
                if (args.assignee)
                    filter.assignee = args.assignee;
                if (args.sprintId)
                    filter.sprintId = args.sprintId;
                return graphStore.getNodes(filter);
            },
            prs: async (_, args) => {
                const filter = { type: 'pr' };
                if (args.status)
                    filter.status = args.status;
                if (args.author)
                    filter.author = args.author;
                return graphStore.getNodes(filter);
            },
            agents: async (_, args) => {
                const filter = { type: 'agent' };
                if (args.status)
                    filter.status = args.status;
                if (args.agentType)
                    filter.agentType = args.agentType;
                return graphStore.getNodes(filter);
            },
            commitments: async (_, args) => {
                const filter = { type: 'commitment' };
                if (args.status)
                    filter.status = args.status;
                if (args.customer)
                    filter.customer = args.customer;
                return graphStore.getNodes(filter);
            },
            sprints: async (_, args) => {
                const filter = { type: 'sprint' };
                if (args.status)
                    filter.status = args.status;
                return graphStore.getNodes(filter);
            },
            edges: async (_, args) => {
                return graphStore.getEdges(args);
            },
            healthScore: () => ({ overall: 75, velocity: 80, quality: 70, predictability: 75, agentEfficiency: 85, alerts: [] }),
        },
        Mutation: {
            createTicket: async (_, { input }) => {
                const ticket = {
                    id: crypto.randomUUID(),
                    type: 'ticket',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    createdBy: 'api',
                    title: input.title || '',
                    description: input.description || '',
                    status: input.status || 'backlog',
                    priority: input.priority || 'P2',
                    labels: input.labels || [],
                    agentEligible: false,
                    complexity: 'unknown',
                    ...input,
                };
                return graphStore.createNode(ticket);
            },
            updateTicket: async (_, { id, input }) => {
                return graphStore.updateNode(id, input);
            },
            deleteNode: async (_, { id }) => graphStore.deleteNode(id),
            assignTicket: async (_, { ticketId, assigneeId }) => {
                return graphStore.updateNode(ticketId, { assignee: assigneeId });
            },
            createEdge: async (_, { input }) => {
                const edge = {
                    id: crypto.randomUUID(),
                    type: input.type,
                    sourceId: input.sourceId,
                    targetId: input.targetId,
                    createdAt: new Date(),
                    createdBy: 'api',
                    weight: input.weight || 1,
                    metadata: input.metadata,
                };
                return graphStore.createEdge(edge);
            },
            deleteEdge: async (_, { id }) => graphStore.deleteEdge(id),
            triageTicket: () => ({
                priority: 'P2', type: 'task', area: 'general', complexity: 'medium',
                estimate: 3, agentEligible: true, confidence: 75, reasoning: [], suggestedLabels: [], riskScore: 25,
            }),
        },
        Ticket: {
            relatedPRs: async (ticket) => {
                const edges = await graphStore.getEdges({ targetId: ticket.id, type: 'implements' });
                const prs = await Promise.all(edges.map(e => graphStore.getNode(e.sourceId)));
                return prs.filter((p) => p !== null && p.type === 'pr');
            },
            blockedBy: async (ticket) => {
                const edges = await graphStore.getEdges({ sourceId: ticket.id, type: 'blocked_by' });
                const tickets = await Promise.all(edges.map(e => graphStore.getNode(e.targetId)));
                return tickets.filter((t) => t !== null);
            },
        },
        PR: {
            linkedTickets: async (pr) => {
                const edges = await graphStore.getEdges({ sourceId: pr.id, type: 'implements' });
                const tickets = await Promise.all(edges.map(e => graphStore.getNode(e.targetId)));
                return tickets.filter((t) => t !== null);
            },
        },
        Edge: {
            source: async (edge) => graphStore.getNode(edge.sourceId),
            target: async (edge) => graphStore.getNode(edge.targetId),
        },
        Node: {
            __resolveType: (node) => {
                const typeMap = {
                    ticket: 'Ticket', pr: 'PR', agent: 'Agent', commitment: 'Commitment', sprint: 'Sprint',
                };
                return typeMap[node.type] || 'Ticket';
            },
        },
    };
    const schema = (0, graphql_yoga_1.createSchema)({ typeDefs, resolvers });
    return (0, graphql_yoga_1.createYoga)({ schema, graphqlEndpoint: '/graphql' });
}
