export const NodeLabels = {
  Person: 'Person',
  Org: 'Org',
  Asset: 'Asset',
  Event: 'Event',
  Indicator: 'Indicator',
} as const;

export const EdgeTypes = {
  MEMBER_OF: 'MEMBER_OF',
  OWNS: 'OWNS',
  MENTIONED_IN: 'MENTIONED_IN',
  RELATED_TO: 'RELATED_TO',
} as const;

export type NodeLabel = keyof typeof NodeLabels;
export type EdgeType = keyof typeof EdgeTypes;

export interface BaseEntity {
  id: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PersonEntity extends BaseEntity {
  label: 'Person';
  fullName: string;
  role?: string;
  email?: string;
}

export interface OrgEntity extends BaseEntity {
  label: 'Org';
  name: string;
  industry?: string;
  region?: string;
}

export interface AssetEntity extends BaseEntity {
  label: 'Asset';
  name: string;
  type: string;
  criticality?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface EventEntity extends BaseEntity {
  label: 'Event';
  title: string;
  timestamp: string;
  description?: string;
  severity?: string;
}

export interface IndicatorEntity extends BaseEntity {
  label: 'Indicator';
  value: string;
  type: string;
  confidence?: number;
}

export type Entity =
  | PersonEntity
  | OrgEntity
  | AssetEntity
  | EventEntity
  | IndicatorEntity;

export const NATURAL_KEYS: Record<NodeLabel, string[]> = {
  Person: ['email'],
  Org: ['name'],
  Asset: ['name', 'type'],
  Event: ['title', 'timestamp'], // Weak natural key, careful
  Indicator: ['value', 'type'],
};

export const SCHEMA_CONSTRAINTS = [
  // Unique IDs
  'CREATE CONSTRAINT IF NOT EXISTS FOR (n:Person) REQUIRE n.id IS UNIQUE',
  'CREATE CONSTRAINT IF NOT EXISTS FOR (n:Org) REQUIRE n.id IS UNIQUE',
  'CREATE CONSTRAINT IF NOT EXISTS FOR (n:Asset) REQUIRE n.id IS UNIQUE',
  'CREATE CONSTRAINT IF NOT EXISTS FOR (n:Event) REQUIRE n.id IS UNIQUE',
  'CREATE CONSTRAINT IF NOT EXISTS FOR (n:Indicator) REQUIRE n.id IS UNIQUE',

  // Tenant Isolation Indexes
  'CREATE INDEX IF NOT EXISTS FOR (n:Person) ON (n.tenantId)',
  'CREATE INDEX IF NOT EXISTS FOR (n:Org) ON (n.tenantId)',
  'CREATE INDEX IF NOT EXISTS FOR (n:Asset) ON (n.tenantId)',
  'CREATE INDEX IF NOT EXISTS FOR (n:Event) ON (n.tenantId)',
  'CREATE INDEX IF NOT EXISTS FOR (n:Indicator) ON (n.tenantId)',

  // Natural Key Indexes (Composite with tenantId is ideal but Neo4j constraint limited, so use Index)
  // We will enforce uniqueness in application logic via MERGE
  'CREATE INDEX IF NOT EXISTS FOR (n:Person) ON (n.email)',
  'CREATE INDEX IF NOT EXISTS FOR (n:Org) ON (n.name)',
  'CREATE INDEX IF NOT EXISTS FOR (n:Indicator) ON (n.value)',
];
