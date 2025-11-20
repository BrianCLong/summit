/**
 * Mock investigation data for testing
 */

export const mockInvestigation = {
  id: 'inv-test-123',
  title: 'Test Investigation - Organized Crime Network',
  description: 'Investigation into suspected organized crime activities',
  status: 'ACTIVE',
  priority: 'HIGH',
  createdAt: new Date('2024-01-15T10:00:00Z'),
  updatedAt: new Date('2024-01-20T15:30:00Z'),
};

export const mockEntities = [
  {
    id: 'ent-001',
    label: 'John Doe',
    type: 'PERSON',
    risk_score: 0.85,
    connection_count: 15,
    investigationId: 'inv-test-123',
    createdAt: new Date('2024-01-15T11:00:00Z'),
    lastActivity: new Date('2024-01-20T14:00:00Z'),
  },
  {
    id: 'ent-002',
    label: 'ACME Corporation',
    type: 'ORGANIZATION',
    risk_score: 0.65,
    connection_count: 8,
    investigationId: 'inv-test-123',
    createdAt: new Date('2024-01-15T12:00:00Z'),
    lastActivity: new Date('2024-01-19T16:00:00Z'),
  },
  {
    id: 'ent-003',
    label: 'Jane Smith',
    type: 'PERSON',
    risk_score: 0.45,
    connection_count: 5,
    investigationId: 'inv-test-123',
    createdAt: new Date('2024-01-16T09:00:00Z'),
    lastActivity: new Date('2024-01-20T10:00:00Z'),
  },
];

export const mockRelationships = [
  {
    id: 'rel-001',
    source: 'ent-001',
    target: 'ent-002',
    type: 'EMPLOYED_BY',
    weight: 0.9,
    properties: {
      role: 'CEO',
      since: '2020-01-01',
    },
  },
  {
    id: 'rel-002',
    source: 'ent-001',
    target: 'ent-003',
    type: 'ASSOCIATED_WITH',
    weight: 0.7,
    properties: {
      frequency: 'weekly',
    },
  },
  {
    id: 'rel-003',
    source: 'ent-002',
    target: 'ent-003',
    type: 'CONTRACTED_BY',
    weight: 0.6,
    properties: {
      contract_value: 50000,
    },
  },
];

export const mockTimelineEvents = [
  {
    timestamp: new Date('2024-01-15T11:00:00Z'),
    entityId: 'ent-001',
    entityLabel: 'John Doe',
    entityType: 'PERSON',
    eventType: 'ENTITY_CREATED',
    description: 'Person entity "John Doe" was created',
  },
  {
    timestamp: new Date('2024-01-15T12:00:00Z'),
    entityId: 'ent-002',
    entityLabel: 'ACME Corporation',
    entityType: 'ORGANIZATION',
    eventType: 'ENTITY_CREATED',
    description: 'Organization entity "ACME Corporation" was created',
  },
  {
    timestamp: new Date('2024-01-16T09:00:00Z'),
    entityId: 'ent-003',
    entityLabel: 'Jane Smith',
    entityType: 'PERSON',
    eventType: 'ENTITY_CREATED',
    description: 'Person entity "Jane Smith" was created',
  },
];

export const mockNetworkData = {
  nodes: [
    { id: 'ent-001', label: 'John Doe', connections: 15, type: 'PERSON' },
    { id: 'ent-002', label: 'ACME Corporation', connections: 8, type: 'ORGANIZATION' },
    { id: 'ent-003', label: 'Jane Smith', connections: 5, type: 'PERSON' },
  ],
  edges: [
    { source: 'ent-001', target: 'ent-002', weight: 0.9 },
    { source: 'ent-001', target: 'ent-003', weight: 0.7 },
    { source: 'ent-002', target: 'ent-003', weight: 0.6 },
  ],
};

export const mockLargeDataset = {
  entities: Array(5000)
    .fill(null)
    .map((_, i) => ({
      id: `entity-${i}`,
      label: `Entity ${i}`,
      type: i % 2 === 0 ? 'PERSON' : 'ORGANIZATION',
      risk_score: Math.random(),
      connection_count: Math.floor(Math.random() * 20),
    })),
  relationships: Array(8000)
    .fill(null)
    .map((_, i) => ({
      id: `rel-${i}`,
      source: `entity-${i % 5000}`,
      target: `entity-${(i + 1) % 5000}`,
      type: 'CONNECTED_TO',
      weight: Math.random(),
    })),
};
