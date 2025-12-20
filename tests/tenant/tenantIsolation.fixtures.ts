import type {
  AuditEvent,
  ExportArtifact,
  GraphNeighborhood,
  GraphPath,
  RagAnswer,
  SearchResult,
  TenantFixture,
} from './tenantIsolationHarness';

const alphaSearchResults: SearchResult[] = [
  {
    id: 'alpha-entity-1',
    title: 'Alpha Node One',
    type: 'person',
    tenantId: 'tenant-alpha',
    scope: { tenant: 'tenant-alpha' },
    tags: ['alpha', 'search'],
  },
  {
    id: 'alpha-entity-2',
    title: 'Alpha Threat Surface',
    type: 'infrastructure',
    tenantId: 'tenant-alpha',
    scope: { tenant: 'tenant-alpha' },
    tags: ['alpha', 'search', 'surface'],
  },
];

const bravoSearchResults: SearchResult[] = [
  {
    id: 'bravo-entity-1',
    title: 'Bravo Anchor',
    type: 'organization',
    tenantId: 'tenant-bravo',
    scope: { tenant: 'tenant-bravo' },
    tags: ['bravo', 'search'],
  },
  {
    id: 'bravo-entity-2',
    title: 'Bravo Signal Cluster',
    type: 'signal',
    tenantId: 'tenant-bravo',
    scope: { tenant: 'tenant-bravo' },
    tags: ['bravo', 'search', 'cluster'],
  },
];

const alphaGraphPaths: GraphPath[] = [
  {
    pathId: 'alpha-path-1',
    start: 'alpha-entity-1',
    end: 'alpha-entity-2',
    hops: 2,
    tenantId: 'tenant-alpha',
    riskScore: 0.12,
    scope: { tenant: 'tenant-alpha' },
  },
  {
    pathId: 'alpha-path-2',
    start: 'alpha-entity-2',
    end: 'alpha-entity-1',
    hops: 3,
    tenantId: 'tenant-alpha',
    riskScore: 0.08,
    scope: { tenant: 'tenant-alpha' },
  },
];

const bravoGraphPaths: GraphPath[] = [
  {
    pathId: 'bravo-path-1',
    start: 'bravo-entity-1',
    end: 'bravo-entity-2',
    hops: 1,
    tenantId: 'tenant-bravo',
    riskScore: 0.2,
    scope: { tenant: 'tenant-bravo' },
  },
  {
    pathId: 'bravo-path-2',
    start: 'bravo-entity-2',
    end: 'bravo-entity-1',
    hops: 4,
    tenantId: 'tenant-bravo',
    riskScore: 0.33,
    scope: { tenant: 'tenant-bravo' },
  },
];

const alphaGraphNeighbors: GraphNeighborhood[] = [
  {
    nodeId: 'alpha-entity-1',
    neighbors: ['alpha-entity-2'],
    tenantId: 'tenant-alpha',
    label: 'Alpha Anchor',
    scope: { tenant: 'tenant-alpha' },
  },
  {
    nodeId: 'alpha-entity-2',
    neighbors: ['alpha-entity-1'],
    tenantId: 'tenant-alpha',
    label: 'Alpha Surface',
    scope: { tenant: 'tenant-alpha' },
  },
];

const bravoGraphNeighbors: GraphNeighborhood[] = [
  {
    nodeId: 'bravo-entity-1',
    neighbors: ['bravo-entity-2'],
    tenantId: 'tenant-bravo',
    label: 'Bravo Anchor',
    scope: { tenant: 'tenant-bravo' },
  },
  {
    nodeId: 'bravo-entity-2',
    neighbors: ['bravo-entity-1'],
    tenantId: 'tenant-bravo',
    label: 'Bravo Cluster',
    scope: { tenant: 'tenant-bravo' },
  },
];

const alphaRagAnswers: RagAnswer[] = [
  {
    answerId: 'alpha-rag-1',
    question: 'What is the latest Alpha intrusion set?',
    answer: 'Alpha intrusion set leverages lateral movement via service accounts.',
    tenantId: 'tenant-alpha',
    citations: ['alpha-doc-1', 'alpha-doc-2'],
    scope: { tenant: 'tenant-alpha' },
  },
];

const bravoRagAnswers: RagAnswer[] = [
  {
    answerId: 'bravo-rag-1',
    question: 'How does Bravo campaign persist?',
    answer: 'Bravo campaign relies on signed loader beacons.',
    tenantId: 'tenant-bravo',
    citations: ['bravo-doc-1'],
    scope: { tenant: 'tenant-bravo' },
  },
];

const alphaExports: ExportArtifact[] = [
  {
    exportId: 'alpha-export-graph',
    artifactName: 'alpha-graph.csv',
    checksum: 'alpha-checksum',
    tenantId: 'tenant-alpha',
    scope: { tenant: 'tenant-alpha' },
  },
];

const bravoExports: ExportArtifact[] = [
  {
    exportId: 'bravo-export-graph',
    artifactName: 'bravo-graph.csv',
    checksum: 'bravo-checksum',
    tenantId: 'tenant-bravo',
    scope: { tenant: 'tenant-bravo' },
  },
];

const alphaAuditEvents: AuditEvent[] = [
  {
    eventId: 'alpha-audit-1',
    action: 'VIEW_SEARCH_RESULT',
    resourceId: 'alpha-entity-1',
    tenantId: 'tenant-alpha',
    severity: 'info',
    scope: { tenant: 'tenant-alpha' },
  },
];

const bravoAuditEvents: AuditEvent[] = [
  {
    eventId: 'bravo-audit-1',
    action: 'EXPORT_GRAPH',
    resourceId: 'bravo-export-graph',
    tenantId: 'tenant-bravo',
    severity: 'warn',
    scope: { tenant: 'tenant-bravo' },
  },
];

export function createTenantFixtures(): TenantFixture[] {
  return [
    {
      tenantId: 'tenant-alpha',
      searchResults: alphaSearchResults,
      graphPaths: alphaGraphPaths,
      graphNeighbors: alphaGraphNeighbors,
      ragAnswers: alphaRagAnswers,
      exports: alphaExports,
      auditEvents: alphaAuditEvents,
    },
    {
      tenantId: 'tenant-bravo',
      searchResults: bravoSearchResults,
      graphPaths: bravoGraphPaths,
      graphNeighbors: bravoGraphNeighbors,
      ragAnswers: bravoRagAnswers,
      exports: bravoExports,
      auditEvents: bravoAuditEvents,
    },
  ];
}

