/* This file is auto-generated via GraphQL codegen */
export type Entity = {
  id: string;
  type: string;
  value: string;
  confidence?: number | null;
  source?: string | null;
  firstSeen?: string | null;
  lastSeen?: string | null;
  properties?: any | null;
  metadata?: any | null;
};

export type Relationship = {
  id: string;
  source: string;
  target: string;
  type: string;
  label?: string | null;
  confidence?: number | null;
  properties?: any | null;
};

export type Query = {
  entities: Entity[];
  relationships: Relationship[];
};

export type Mutation = {
  upsertEntity: Entity;
};
