"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../src/index");
const server_1 = require("@apollo/server");
const subgraph_1 = require("@apollo/subgraph");
const graphql_tag_1 = require("graphql-tag");
const supertest_1 = __importDefault(require("supertest"));
const crypto_1 = require("crypto");
const standalone_1 = require("@apollo/server/standalone");
async function startSubgraph(port, typeDefs, resolvers) {
    const server = new server_1.ApolloServer({
        schema: (0, subgraph_1.buildSubgraphSchema)([{ typeDefs: (0, graphql_tag_1.gql)(typeDefs), resolvers }]),
    });
    await (0, standalone_1.startStandaloneServer)(server, { listen: { port } });
}
beforeAll(async () => {
    await startSubgraph(4001, `
    type Account @key(fields: "id") { id: ID!, name: String }
    type Query { account(id: ID!): Account }
  `, {
        Query: { account: (_, { id }) => ({ id, name: `acct-${id}` }) },
    });
    await startSubgraph(4002, `
    type Product @key(fields: "id") { id: ID!, name: String }
    type Query { product(id: ID!): Product }
  `, {
        Query: { product: (_, { id }) => ({ id, name: `prod-${id}` }) },
    });
    await startSubgraph(4003, `
    type Review @key(fields: "id") { id: ID!, body: String }
    type Query { review(id: ID!): Review }
  `, {
        Query: { review: (_, { id }) => ({ id, body: `body-${id}` }) },
    });
    await (0, index_1.start)();
});
afterAll(async () => {
    // subgraphs are left running for test simplicity
});
test('federates across subgraphs', async () => {
    const query = `query GetData($id: ID!) {
    account(id: $id) { id name }
    product(id: $id) { id name }
    review(id: $id) { id body }
  }`;
    const hash = (0, crypto_1.createHash)('sha256').update(query).digest('hex');
    const res = await (0, supertest_1.default)(index_1.app)
        .post('/graphql')
        .send({
        query,
        variables: { id: '1' },
        extensions: { persistedQuery: { version: 1, sha256Hash: hash } },
    })
        .expect(200);
    expect(res.body.data.account.name).toBe('acct-1');
    expect(res.body.data.product.name).toBe('prod-1');
    expect(res.body.data.review.body).toBe('body-1');
});
test('health endpoint aggregates subgraphs', async () => {
    const res = await (0, supertest_1.default)(index_1.app).get('/health/federation').expect(200);
    expect(res.body).toMatchObject({
        accounts: true,
        products: true,
        reviews: true,
    });
});
