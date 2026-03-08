"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FederatedGateway = void 0;
const graphql_1 = require("graphql");
const composition_js_1 = require("./composition.js");
class FederatedGateway {
    composition;
    schema;
    entityResolvers;
    constructor(services) {
        const { schema, composition, entityResolvers } = (0, composition_js_1.composeServices)(services);
        this.schema = schema;
        this.composition = composition;
        this.entityResolvers = entityResolvers;
    }
    get sdl() {
        return this.composition.schemaSDL;
    }
    async execute(query, variables, contextValue) {
        const result = await (0, graphql_1.graphql)({
            schema: this.schema,
            source: query,
            variableValues: variables,
            contextValue,
        });
        return { data: result.data, errors: result.errors };
    }
    async resolveEntity(reference, context, info) {
        const resolver = this.entityResolvers.get(reference.__typename);
        if (!resolver) {
            return reference;
        }
        return resolver(reference, context, info);
    }
    async executeWithSchema(source, variables, contextValue) {
        return (0, graphql_1.execute)({
            schema: this.schema,
            document: (0, graphql_1.parse)(source),
            variableValues: variables,
            contextValue,
        });
    }
}
exports.FederatedGateway = FederatedGateway;
