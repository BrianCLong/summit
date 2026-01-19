import { createSchema, createYoga } from 'graphql-yoga';
import type {
  WorkGraphNode,
  Ticket,
  PR,
  Agent,
  Commitment,
  Sprint,
  Epic,
  Intent,
  Board,
  Roadmap,
  Milestone,
} from '../schema/nodes.js';
import type { WorkGraphEdge } from '../schema/edges.js';
import { autoParseBacklog } from '../import/parsers.js';

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
    epics(status: String): [Epic!]!
    intents(status: String): [Intent!]!
    boards(archived: Boolean): [Board!]!
    roadmaps(status: String): [Roadmap!]!
    milestones(status: String): [Milestone!]!
    backlog(boardId: ID): [Ticket!]!
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
    createBoard(input: CreateBoardInput!): Board!
    createRoadmap(input: CreateRoadmapInput!): Roadmap!
    createMilestone(input: CreateMilestoneInput!): Milestone!
    importBacklog(input: ImportBacklogInput!): ImportResult!
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
    area: String
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

  type Epic implements Node {
    id: ID!
    type: String!
    createdAt: DateTime!
    updatedAt: DateTime!
    createdBy: String!
    metadata: JSON
    title: String!
    description: String!
    status: String!
    progress: Float!
    owner: String
  }

  type Intent implements Node {
    id: ID!
    type: String!
    createdAt: DateTime!
    updatedAt: DateTime!
    createdBy: String!
    metadata: JSON
    title: String!
    description: String!
    source: String!
    priority: String!
    status: String!
    customer: String
  }

  type Board implements Node {
    id: ID!
    type: String!
    createdAt: DateTime!
    updatedAt: DateTime!
    createdBy: String!
    metadata: JSON
    name: String!
    description: String
    boardType: String!
    columns: [BoardColumn!]!
    owner: String
    team: String
    isDefault: Boolean!
    archived: Boolean!
    itemCount: Int!
  }

  type BoardColumn {
    id: ID!
    name: String!
    position: Int!
    wipLimit: Int
    color: String
  }

  type Roadmap implements Node {
    id: ID!
    type: String!
    createdAt: DateTime!
    updatedAt: DateTime!
    createdBy: String!
    metadata: JSON
    name: String!
    description: String
    status: String!
    owner: String
    team: String
    swimlanes: [Swimlane!]!
  }

  type Swimlane {
    id: ID!
    name: String!
    color: String
    position: Int!
  }

  type Milestone implements Node {
    id: ID!
    type: String!
    createdAt: DateTime!
    updatedAt: DateTime!
    createdBy: String!
    metadata: JSON
    name: String!
    description: String
    targetDate: DateTime!
    milestoneType: String!
    status: String!
    progress: Float!
    owner: String
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

  type ImportResult {
    imported: Int!
    skipped: Int!
    errors: [String!]!
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

  input CreateBoardInput {
    name: String!
    description: String
    boardType: String!
    team: String
  }

  input CreateRoadmapInput {
    name: String!
    description: String
    status: String
    team: String
  }

  input CreateMilestoneInput {
    name: String!
    description: String
    targetDate: DateTime!
    milestoneType: String!
    status: String!
  }

  input ImportBacklogInput {
    content: String!
    source: String!
    autoTriage: Boolean
  }
`;

export function createWorkGraphAPI(graphStore: GraphStore) {
  const resolvers = {
    Query: {
      node: (_: unknown, { id }: { id: string }) => graphStore.getNode(id),
      nodes: async (_: unknown, { type, status, limit }: { type?: string; status?: string; limit?: number }) => {
        const filter: Record<string, unknown> = {};
        if (type) filter.type = type;
        if (status) filter.status = status;
        let results = await graphStore.getNodes(filter as Record<string, unknown>);
        if (limit) results = results.slice(0, limit);
        return results;
      },
      tickets: async (_: unknown, args: { status?: string; priority?: string; assignee?: string }) => {
        const filter: Partial<Ticket> = { type: 'ticket' };
        if (args.status) filter.status = args.status as Ticket['status'];
        if (args.priority) filter.priority = args.priority as Ticket['priority'];
        if (args.assignee) filter.assignee = args.assignee;
        return graphStore.getNodes<Ticket>(filter);
      },
      prs: async (_: unknown, args: { status?: string; author?: string }) => {
        const filter: Partial<PR> = { type: 'pr' };
        if (args.status) filter.status = args.status as PR['status'];
        if (args.author) filter.author = args.author;
        return graphStore.getNodes<PR>(filter);
      },
      agents: async (_: unknown, args: { status?: string }) => {
        const filter: Partial<Agent> = { type: 'agent' };
        if (args.status) filter.status = args.status as Agent['status'];
        return graphStore.getNodes<Agent>(filter);
      },
      commitments: async (_: unknown, args: { status?: string }) => {
        const filter: Partial<Commitment> = { type: 'commitment' };
        if (args.status) filter.status = args.status as Commitment['status'];
        return graphStore.getNodes<Commitment>(filter);
      },
      sprints: async (_: unknown, args: { status?: string }) => {
        const filter: Partial<Sprint> = { type: 'sprint' };
        if (args.status) filter.status = args.status as Sprint['status'];
        return graphStore.getNodes<Sprint>(filter);
      },
      epics: async (_: unknown, args: { status?: string }) => {
        const filter: Partial<Epic> = { type: 'epic' };
        if (args.status) filter.status = args.status as Epic['status'];
        return graphStore.getNodes<Epic>(filter);
      },
      intents: async (_: unknown, args: { status?: string }) => {
        const filter: Partial<Intent> = { type: 'intent' };
        if (args.status) filter.status = args.status as Intent['status'];
        return graphStore.getNodes<Intent>(filter);
      },
      boards: async (_: unknown, args: { archived?: boolean }) => {
        const filter: Partial<Board> = { type: 'board' };
        if (args.archived !== undefined) filter.archived = args.archived;
        return graphStore.getNodes<Board>(filter);
      },
      roadmaps: async (_: unknown, args: { status?: string }) => {
        const filter: Partial<Roadmap> = { type: 'roadmap' };
        if (args.status) filter.status = args.status as Roadmap['status'];
        return graphStore.getNodes<Roadmap>(filter);
      },
      milestones: async (_: unknown, args: { status?: string }) => {
        const filter: Partial<Milestone> = { type: 'milestone' };
        if (args.status) filter.status = args.status as Milestone['status'];
        return graphStore.getNodes<Milestone>(filter);
      },
      backlog: async (_: unknown, _args: { boardId?: string }) => {
        return graphStore.getNodes<Ticket>({ type: 'ticket', status: 'backlog' });
      },
      edges: (_: unknown, args: { sourceId?: string; targetId?: string; type?: string }) => graphStore.getEdges(args),
      healthScore: () => ({
        overall: 75,
        velocity: 80,
        quality: 70,
        predictability: 75,
        agentEfficiency: 85,
        alerts: [],
      }),
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
          ticketType: (input.ticketType as Ticket['ticketType']) || 'unknown',
          labels: input.labels || [],
          agentEligible: false,
          complexity: 'unknown',
          ...input,
        };
        return graphStore.createNode(ticket);
      },
      updateTicket: (_: unknown, { id, input }: { id: string; input: Partial<Ticket> }) =>
        graphStore.updateNode<Ticket>(id, input),
      deleteNode: (_: unknown, { id }: { id: string }) => graphStore.deleteNode(id),
      assignTicket: (_: unknown, { ticketId, assigneeId }: { ticketId: string; assigneeId: string }) =>
        graphStore.updateNode<Ticket>(ticketId, { assignee: assigneeId }),
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
      deleteEdge: (_: unknown, { id }: { id: string }) => graphStore.deleteEdge(id),
      createBoard: async (_: unknown, { input }: { input: { name: string; description?: string; boardType: string; team?: string } }) => {
        const board: Board = {
          id: crypto.randomUUID(),
          type: 'board',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'api',
          name: input.name,
          description: input.description,
          boardType: input.boardType as Board['boardType'],
          columns: [
            { id: crypto.randomUUID(), name: 'Backlog', position: 0 },
            { id: crypto.randomUUID(), name: 'In Progress', position: 1 },
            { id: crypto.randomUUID(), name: 'Done', position: 2 },
          ],
          team: input.team,
          isDefault: false,
          archived: false,
          itemCount: 0,
        };
        return graphStore.createNode(board);
      },
      createRoadmap: async (_: unknown, { input }: { input: { name: string; description?: string; status?: string; team?: string } }) => {
        const roadmap: Roadmap = {
          id: crypto.randomUUID(),
          type: 'roadmap',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'api',
          name: input.name,
          description: input.description,
          status: (input.status as Roadmap['status']) || 'draft',
          timeframe: {
            start: new Date(),
            end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            granularity: 'quarter',
          },
          swimlanes: [
            { id: crypto.randomUUID(), name: 'Platform', color: '#3B82F6', position: 0 },
            { id: crypto.randomUUID(), name: 'Features', color: '#10B981', position: 1 },
            { id: crypto.randomUUID(), name: 'Security', color: '#EF4444', position: 2 },
          ],
          team: input.team,
          visibility: 'team',
        };
        return graphStore.createNode(roadmap);
      },
      createMilestone: async (_: unknown, { input }: { input: { name: string; description?: string; targetDate: string; milestoneType: string; status: string } }) => {
        const milestone: Milestone = {
          id: crypto.randomUUID(),
          type: 'milestone',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'api',
          name: input.name,
          description: input.description,
          targetDate: new Date(input.targetDate),
          milestoneType: input.milestoneType as Milestone['milestoneType'],
          status: input.status as Milestone['status'],
          progress: 0,
          successCriteria: [],
          stakeholders: [],
        };
        return graphStore.createNode(milestone);
      },
      importBacklog: async (_: unknown, { input }: { input: { content: string; source: string; autoTriage?: boolean } }) => {
        const parseResult = autoParseBacklog(input.content, input.source);
        let imported = 0;
        let skipped = 0;
        const errors: string[] = [...parseResult.errors];

        for (const item of parseResult.items) {
          try {
            if (item.itemType === 'epic') {
              await graphStore.createNode<Epic>({
                id: crypto.randomUUID(),
                type: 'epic',
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: 'importer',
                title: item.title,
                description: item.description || `Imported from ${input.source}`,
                status: 'planned',
                progress: 0,
              });
            } else {
              await graphStore.createNode<Ticket>({
                id: crypto.randomUUID(),
                type: 'ticket',
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: 'importer',
                title: item.title,
                description: item.description || `Imported from ${input.source}`,
                status: (item.status as Ticket['status']) || 'backlog',
                priority: (item.priority as Ticket['priority']) || 'P2',
                ticketType: 'unknown',
                labels: item.labels || [],
                agentEligible: false,
                complexity: 'unknown',
              });
            }
            imported++;
          } catch (e) {
            errors.push(`Failed to import "${item.title}": ${e}`);
            skipped++;
          }
        }

        return { imported, skipped, errors };
      },
    },
    Node: {
      __resolveType: (node: WorkGraphNode) => {
        const typeMap: Record<string, string> = {
          ticket: 'Ticket',
          pr: 'PR',
          agent: 'Agent',
          commitment: 'Commitment',
          sprint: 'Sprint',
          epic: 'Epic',
          intent: 'Intent',
          board: 'Board',
          roadmap: 'Roadmap',
          milestone: 'Milestone',
          hypothesis: 'Ticket',
          test: 'Ticket',
          scan: 'Ticket',
          incident: 'Ticket',
          customer: 'Ticket',
          environment: 'Ticket',
          policy: 'Ticket',
        };
        return typeMap[node.type] || 'Ticket';
      },
    },
  };

  const schema = createSchema({ typeDefs, resolvers });
  return createYoga({ schema, graphqlEndpoint: '/graphql' });
}
