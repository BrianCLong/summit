class GraphQLTester {
  constructor({ endpoint } = {}) {
    this.endpoint = endpoint || 'http://localhost/graphql';
  }

  async query(_query, _variables) {
    return { data: { ok: true, version: 'test' }, errors: undefined };
  }

  async mutate(_mutation, _variables) {
    return { data: { ok: true }, errors: undefined };
  }
}

module.exports = { createTestClient: (options) => new GraphQLTester(options) };
module.exports.GraphQLTester = GraphQLTester;
