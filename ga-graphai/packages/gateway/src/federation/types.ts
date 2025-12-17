import type { GraphQLResolveInfo } from 'graphql';

type MaybePromise<T> = Promise<T> | T;

export type ResolverFn<TResult = unknown, TParent = unknown, TArgs = Record<string, unknown>, TContext = unknown> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => MaybePromise<TResult>;

export type ResolverEntry = ResolverFn | ResolverFn[];

export type ResolverMap = Record<string, Record<string, ResolverEntry>>;

export type EntityResolver<TContext = unknown> = (
  reference: { __typename: string; [key: string]: unknown },
  context: TContext,
  info: GraphQLResolveInfo,
) => MaybePromise<unknown>;

export interface FederationServiceDefinition<TContext = unknown> {
  name: string;
  typeDefs: string;
  resolvers?: ResolverMap;
  entityResolvers?: Record<string, EntityResolver<TContext>>;
  url?: string;
  namespace?: string;
}

export interface FederationCompositionResult {
  schemaSDL: string;
  services: string[];
  entities: string[];
}
