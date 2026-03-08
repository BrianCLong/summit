"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const schema_1 = require("@graphql-tools/schema");
const typeDefs_1 = require("../../src/api/graphql/taskThread/typeDefs");
const resolvers_1 = require("../../src/api/graphql/taskThread/resolvers");
describe('TaskThread Schema', () => {
    it('should compile correctly', () => {
        expect(() => {
            (0, schema_1.makeExecutableSchema)({
                typeDefs: [typeDefs_1.typeDefs],
                resolvers: [resolvers_1.resolvers],
            });
        }).not.toThrow();
    });
});
