"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.composeServices = composeServices;
const graphql_1 = require("graphql");
function parseJsonLiteral(ast) {
    switch (ast.kind) {
        case graphql_1.Kind.STRING:
        case graphql_1.Kind.BOOLEAN:
            return ast.value;
        case graphql_1.Kind.INT:
            return Number.parseInt(ast.value, 10);
        case graphql_1.Kind.FLOAT:
            return Number.parseFloat(ast.value);
        case graphql_1.Kind.OBJECT: {
            const value = {};
            for (const field of ast.fields) {
                value[field.name.value] = parseJsonLiteral(field.value);
            }
            return value;
        }
        case graphql_1.Kind.LIST:
            return ast.values.map(parseJsonLiteral);
        case graphql_1.Kind.NULL:
            return null;
        default:
            return null;
    }
}
function normalizeResolverEntry(entry) {
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
    return entry;
}
function attachResolvers(schema, resolvers) {
    const typeMap = schema.getTypeMap();
    for (const [typeName, fieldResolvers] of Object.entries(resolvers)) {
        const type = typeMap[typeName];
        if (!type || !(type instanceof graphql_1.GraphQLObjectType)) {
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
function buildFederationSDL(services, entityTypeNames) {
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
function mergeResolverMaps(services) {
    const merged = {};
    for (const service of services) {
        if (!service.resolvers)
            continue;
        for (const [typeName, fieldMap] of Object.entries(service.resolvers)) {
            merged[typeName] = merged[typeName] ?? {};
            for (const [fieldName, resolver] of Object.entries(fieldMap)) {
                const existing = merged[typeName][fieldName];
                if (existing) {
                    const combined = Array.isArray(existing)
                        ? existing
                        : [existing];
                    merged[typeName][fieldName] = [...combined, resolver];
                }
                else {
                    merged[typeName][fieldName] = resolver;
                }
            }
        }
    }
    return merged;
}
function buildBaseResolvers(context) {
    const resolvers = {
        Query: {
            _service: () => ({ sdl: context.composedSDL }),
            _entities: async (_root, args, cxt, info) => {
                return Promise.all(args.representations.map(async (reference) => {
                    const resolver = context.entityResolvers.get(reference.__typename);
                    if (!resolver) {
                        return reference;
                    }
                    return resolver(reference, cxt, info);
                }));
            },
        },
        _Service: {
            sdl: (service) => service.sdl,
        },
    };
    return resolvers;
}
function buildFederationScalars(schema) {
    const typeMap = schema.getTypeMap();
    const anyScalar = typeMap._Any;
    if (anyScalar instanceof graphql_1.GraphQLScalarType) {
        anyScalar.serialize = (value) => value;
        anyScalar.parseValue = (value) => value;
        anyScalar.parseLiteral = parseJsonLiteral;
    }
}
function attachEntityResolveType(schema) {
    const typeMap = schema.getTypeMap();
    const entityUnion = typeMap._Entity;
    if (entityUnion instanceof graphql_1.GraphQLUnionType) {
        entityUnion.resolveType = (value) => {
            if (value && typeof value === 'object' && '__typename' in value) {
                const typeName = value.__typename;
                const target = schema.getType(typeName);
                if (target)
                    return target;
            }
            return undefined;
        };
    }
}
function composeServices(services) {
    const entityResolvers = new Map();
    for (const service of services) {
        if (!service.entityResolvers)
            continue;
        for (const [typeName, resolver] of Object.entries(service.entityResolvers)) {
            entityResolvers.set(typeName, resolver);
        }
    }
    const entityTypeNames = Array.from(entityResolvers.keys());
    const composedSDL = buildFederationSDL(services, entityTypeNames);
    const schema = (0, graphql_1.buildSchema)(composedSDL);
    buildFederationScalars(schema);
    attachEntityResolveType(schema);
    const resolverMap = mergeResolverMaps(services);
    const normalizedResolvers = {};
    for (const [typeName, fieldMap] of Object.entries(resolverMap)) {
        normalizedResolvers[typeName] = {};
        for (const [fieldName, resolver] of Object.entries(fieldMap)) {
            normalizedResolvers[typeName][fieldName] = normalizeResolverEntry(resolver);
        }
    }
    const baseResolvers = buildBaseResolvers({ schema, entityResolvers, composedSDL });
    attachResolvers(schema, { ...baseResolvers, ...normalizedResolvers });
    const composition = {
        schemaSDL: composedSDL,
        services: services.map((service) => service.name),
        entities: entityTypeNames,
    };
    return { schema, composition, entityResolvers };
}
