const { ApolloServer, gql } = require('apollo-server');
const fs = require('fs');
const path = require('path');

const typeDefs = gql(fs.readFileSync(path.join(__dirname, 'schema.graphql'), 'utf8'));

// Provide resolver mocks for a runnable server
const resolvers = {
  Query: {
    entityById: () => ({
      id: 'person-1',
      tenant: 'dev-tenant',
      labels: ['Person'],
      name: 'Alice',
    }),
    searchEntities: () => [{
      id: 'person-1',
      tenant: 'dev-tenant',
      labels: ['Person'],
      name: 'Alice',
    }],
    neighbors: () => [],
  },
  Entity: {
    __resolveType(obj, context, info){
      if(obj.name){
        return 'Person';
      }
      return null;
    },
  },
};

const server = new ApolloServer({ typeDefs, resolvers });

server.listen({ port: 4000 }).then(({ url }) => {
  console.log(`🚀 Gateway ready at ${url}`);
});
