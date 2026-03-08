"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const graphql_1 = require("graphql");
const schema_1 = require("@graphql-tools/schema");
const schema_collab_js_1 = require("../src/graphql/schema.collab.js");
const resolvers_collab_js_1 = __importDefault(require("../src/graphql/resolvers.collab.js"));
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('collab resolvers', () => {
    (0, globals_1.it)('creates a branch', async () => {
        const schema = (0, schema_1.makeExecutableSchema)({
            typeDefs: schema_collab_js_1.collabTypeDefs,
            resolvers: resolvers_collab_js_1.default,
        });
        const mutation = `mutation { createBranch(name: \"test\"){ id name } }`;
        const result = await (0, graphql_1.graphql)({ schema, source: mutation });
        (0, globals_1.expect)(result.errors).toBeUndefined();
        (0, globals_1.expect)(result.data?.createBranch.name).toBe('test');
    });
});
