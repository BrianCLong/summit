import {
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLUnionType,
  GraphQLObjectType,
  Kind,
  buildSchema,
} from 'graphql';
import type { GraphQLFieldResolver, ValueNode } from 'graphql';
import type {
  EntityResolver,
  FederationCompositionResult,
  FederationServiceDefinition,
  ResolverEntry,
  ResolverMap,
} from './types.js';

type ResolverDictionary = Record<string, Record<string, GraphQLFieldResolver>>;

type ResolverBuilderContext = {
  schema: GraphQLSchema;
  entityResolvers: Map<string, EntityResolver>;
  composedSDL: string;
};

function parseJsonLiteral(ast: ValueNode): unknown {
  switch (ast.kind) {
    case Kind.STRING:
    case Kind.BOOLEAN:
      return ast.value;
    case Kind.INT:
      return Number.parseInt(ast.value, 10);
    case Kind.FLOAT:
      return Number.parseFloat(ast.value);
    case Kind.OBJECT: {
      const value: Record<string, unknown> = {};
      for (const field of ast.fields) {
        value[field.name.value] = parseJsonLiteral(field.value);
      }
      return value;
    }
    case Kind.LIST:
      return ast.values.map(parseJsonLiteral);
    case Kind.NULL:
      return null;
    default:
      return null;
  }
}

function normalizeResolverEntry(entry: ResolverEntry): GraphQLFieldResolver {
  if (Array.isArray(entry)) {
    return async (parent, args, context, info) => {
      let current = parent;
      for (const resolver of entry) {
        const result = await resolver(current, args, context, info);
        if (typeof result !== 'undefined') {
          current = result;
        }
      }
      return current;
    };
  }
  return entry as GraphQLFieldResolver;
}

function attachResolvers(schema: GraphQLSchema, resolvers: ResolverDictionary) {
  const typeMap = schema.getTypeMap();
  for (const [typeName, fieldResolvers] of Object.entries(resolvers)) {
    const type = typeMap[typeName];
    if (!type || !(type instanceof GraphQLObjectType)) {
      continue;
    }
    const fields = type.getFields();
    for (const [fieldName, resolver] of Object.entries(fieldResolvers)) {
      if (fields[fieldName]) {
        fields[fieldName].resolve = resolver;
      }
    }
  }
}

function buildFederationSDL(
  services: FederationServiceDefinition[],
  entityTypeNames: string[],
): string {
  const placeholderEntity = 'FederationPlaceholder';
  const entityUnionMembers = entityTypeNames.length
    ? entityTypeNames.join(' | ')
    : placeholderEntity;

  const base = `
    scalar _Any
    type _Service { sdl: String! }
    type Query {
      _service: _Service!
      _entities(representations: [_Any!]!): [_Entity]!
    }
    ${entityTypeNames.length ? '' : `type ${placeholderEntity} { _empty: String }`}
    union _Entity = ${entityUnionMembers}
  `;

  return [base, ...services.map((service) => service.typeDefs)].join('\n');
}

function mergeResolverMaps(services: FederationServiceDefinition[]): ResolverMap {
  const merged: ResolverMap = {};

  for (const service of services) {
    if (!service.resolvers) continue;
    for (const [typeName, fieldMap] of Object.entries(service.resolvers)) {
      merged[typeName] = merged[typeName] ?? {};
      for (const [fieldName, resolver] of Object.entries(fieldMap)) {
        const existing = merged[typeName][fieldName];
        if (existing) {
          const combined = Array.isArray(existing)
            ? existing
            : [existing];
          merged[typeName][fieldName] = [...combined, resolver];
        } else {
          merged[typeName][fieldName] = resolver;
        }
      }
    }
  }

  return merged;
}

function buildBaseResolvers(
  context: ResolverBuilderContext,
): ResolverDictionary {
  const resolvers: ResolverDictionary = {
    Query: {
      _service: () => ({ sdl: context.composedSDL }),
      _entities: async (_root, args: { representations: Array<{ __typename: string }> }, cxt, info) => {
        return Promise.all(
          args.representations.map(async (reference) => {
            const resolver = context.entityResolvers.get(reference.__typename);
            if (!resolver) {
              return reference;
            }
            return resolver(reference, cxt, info);
          }),
        );
      },
    },
    _Service: {
      sdl: (service: { sdl: string }) => service.sdl,
    },
  };

  return resolvers;
}

function buildFederationScalars(schema: GraphQLSchema) {
  const typeMap = schema.getTypeMap();
  const anyScalar = typeMap._Any;
  if (anyScalar instanceof GraphQLScalarType) {
    anyScalar.serialize = (value) => value;
    anyScalar.parseValue = (value) => value;
    anyScalar.parseLiteral = parseJsonLiteral;
  }
}

function attachEntityResolveType(schema: GraphQLSchema) {
  const typeMap = schema.getTypeMap();
  const entityUnion = typeMap._Entity;
  if (entityUnion instanceof GraphQLUnionType) {
    entityUnion.resolveType = (value) => {
      if (value && typeof value === 'object' && '__typename' in value) {
        const typeName = (value as { __typename: string }).__typename;
        const target = schema.getType(typeName);
        if (target) return target as GraphQLObjectType;
      }
      return undefined;
    };
  }
}

export function composeServices(
  services: FederationServiceDefinition[],
): { schema: GraphQLSchema; composition: FederationCompositionResult; entityResolvers: Map<string, EntityResolver> } {
  const entityResolvers = new Map<string, EntityResolver>();
  for (const service of services) {
    if (!service.entityResolvers) continue;
    for (const [typeName, resolver] of Object.entries(service.entityResolvers)) {
      entityResolvers.set(typeName, resolver);
    }
  }

  const entityTypeNames = Array.from(entityResolvers.keys());
  const composedSDL = buildFederationSDL(services, entityTypeNames);
  const schema = buildSchema(composedSDL);

  buildFederationScalars(schema);
  attachEntityResolveType(schema);

  const resolverMap = mergeResolverMaps(services);
  const normalizedResolvers: ResolverDictionary = {};
  for (const [typeName, fieldMap] of Object.entries(resolverMap)) {
    normalizedResolvers[typeName] = {};
    for (const [fieldName, resolver] of Object.entries(fieldMap)) {
      normalizedResolvers[typeName][fieldName] = normalizeResolverEntry(resolver);
    }
  }

  const baseResolvers = buildBaseResolvers({ schema, entityResolvers, composedSDL });
  attachResolvers(schema, { ...baseResolvers, ...normalizedResolvers });

  const composition: FederationCompositionResult = {
    schemaSDL: composedSDL,
    services: services.map((service) => service.name),
    entities: entityTypeNames,
  };

  return { schema, composition, entityResolvers };
}
