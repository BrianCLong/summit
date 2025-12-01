/**
 * TypeScript type definitions for GraphQL resolvers
 *
 * These types provide compile-time safety for resolver implementations
 * and serve as documentation for the API contract.
 */

import type { GraphQLResolveInfo } from 'graphql';

// -----------------------------------------------------------------------------
// Context Types
// -----------------------------------------------------------------------------

export interface UserContext {
  id: string;
  sub?: string;
  tenant: string;
  tenantId?: string;
  roles?: string[];
}

export interface DataLoaders {
  entityLoader: {
    load: (id: string) => Promise<Entity | null>;
    loadMany: (ids: string[]) => Promise<(Entity | Error | null)[]>;
  };
  relationshipLoader: {
    load: (id: string) => Promise<Relationship | null>;
  };
}

export interface ResolverContext {
  user?: UserContext;
  tenantId?: string;
  loaders: DataLoaders;
  logger: {
    info: (data: Record<string, unknown>) => void;
    warn: (data: Record<string, unknown>) => void;
    error: (data: Record<string, unknown>) => void;
  };
  dataSources?: {
    redis?: unknown;
  };
}

// -----------------------------------------------------------------------------
// Entity Types
// -----------------------------------------------------------------------------

export interface Entity {
  id: string;
  tenantId: string;
  type: string;
  kind?: string;
  labels?: string[];
  props: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  deletedAt?: string;
}

export interface EntityInput {
  type: string;
  props: Record<string, unknown>;
}

export interface EntityUpdateInput {
  type?: string;
  props?: Record<string, unknown>;
}

export interface EntitySearchInput {
  tenantId?: string;
  kind?: string;
  type?: string;
  props?: Record<string, unknown>;
  limit?: number;
  offset?: number;
}

// -----------------------------------------------------------------------------
// Relationship Types
// -----------------------------------------------------------------------------

export interface Relationship {
  id: string;
  tenantId: string;
  srcId: string;
  dstId: string;
  type: string;
  props: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
  confidence?: number;
}

export interface RelationshipInput {
  srcId: string;
  dstId: string;
  type: string;
  props?: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// Investigation Types
// -----------------------------------------------------------------------------

export interface Investigation {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface InvestigationStats {
  entityCount: number;
  relationshipCount: number;
  lastActivity: string;
}

// -----------------------------------------------------------------------------
// Resolver Function Types
// -----------------------------------------------------------------------------

export type ResolverFn<TResult, TParent = unknown, TArgs = Record<string, unknown>> = (
  parent: TParent,
  args: TArgs,
  context: ResolverContext,
  info: GraphQLResolveInfo,
) => Promise<TResult> | TResult;

export type QueryResolver<TResult, TArgs = Record<string, unknown>> = ResolverFn<TResult, unknown, TArgs>;

export type MutationResolver<TResult, TArgs = Record<string, unknown>> = ResolverFn<TResult, unknown, TArgs>;

export type FieldResolver<TResult, TParent, TArgs = Record<string, unknown>> = ResolverFn<
  TResult,
  TParent,
  TArgs
>;

// -----------------------------------------------------------------------------
// Direction Enum
// -----------------------------------------------------------------------------

export type RelationshipDirection = 'INCOMING' | 'OUTGOING' | 'BOTH';

export const DIRECTION_MAP: Record<RelationshipDirection, 'incoming' | 'outgoing' | 'both'> = {
  INCOMING: 'incoming',
  OUTGOING: 'outgoing',
  BOTH: 'both',
};
