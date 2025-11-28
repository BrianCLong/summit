import { execute, graphql, parse, type GraphQLSchema } from 'graphql';
import { composeServices } from './composition.js';
import type {
  EntityResolver,
  FederationCompositionResult,
  FederationServiceDefinition,
} from './types.js';

export interface GatewayExecutionResult<T = unknown> {
  data?: T;
  errors?: Array<Error>;
}

export class FederatedGateway<TContext = unknown> {
  readonly composition: FederationCompositionResult;
  private readonly schema: GraphQLSchema;
  private readonly entityResolvers: Map<string, EntityResolver<TContext>>;

  constructor(services: FederationServiceDefinition<TContext>[]) {
    const { schema, composition, entityResolvers } = composeServices(services);
    this.schema = schema;
    this.composition = composition;
    this.entityResolvers = entityResolvers;
  }

  get sdl(): string {
    return this.composition.schemaSDL;
  }

  async execute<T = unknown>(
    query: string,
    variables?: Record<string, unknown>,
    contextValue?: TContext,
  ): Promise<GatewayExecutionResult<T>> {
    const result = await graphql({
      schema: this.schema,
      source: query,
      variableValues: variables,
      contextValue,
    });
    return { data: result.data as T | undefined, errors: result.errors as Error[] | undefined };
  }

  async resolveEntity(
    reference: { __typename: string; [key: string]: unknown },
    context: TContext,
    info: Parameters<EntityResolver>[2],
  ) {
    const resolver = this.entityResolvers.get(reference.__typename);
    if (!resolver) {
      return reference;
    }
    return resolver(reference, context, info);
  }

  async executeWithSchema<T = unknown>(
    source: string,
    variables?: Record<string, unknown>,
    contextValue?: TContext,
  ) {
    return execute({
      schema: this.schema,
      document: parse(source),
      variableValues: variables,
      contextValue,
    }) as Promise<GatewayExecutionResult<T>>;
  }
}
