"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const depthCost_1 = require("../src/plugins/depthCost");
const graphql_1 = require("graphql");
test('rejects over-budget queries', async () => {
    const plugin = (0, depthCost_1.makeDepthCostPlugin)({ maxDepth: 1, maxCost: 1 });
    const schema = (0, graphql_1.buildSchema)('type Query { a: String, b: String }');
    await expect(plugin.requestDidStart({
        schema,
        request: { query: '{ a b }', variables: {} },
    })).rejects.toThrow('Query exceeds limits');
});
