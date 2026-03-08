"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const schema_1 = require("@graphql-tools/schema");
const graphql_1 = require("graphql");
const schema_graphql_1 = __importDefault(require("../../schema.graphql"));
test('GraphQL schema contract (N-1, N-2)', () => {
    const current = (0, graphql_1.printSchema)((0, schema_1.makeExecutableSchema)({ typeDefs: schema_graphql_1.default }));
    const baselines = ['schema.N-1.graphql', 'schema.N-2.graphql'].filter((f) => node_fs_1.default.existsSync(`contracts/graphql/${f}`));
    for (const b of baselines) {
        const baseline = node_fs_1.default.readFileSync(`contracts/graphql/${b}`, 'utf8');
        expect(current).toBe(baseline);
    }
});
