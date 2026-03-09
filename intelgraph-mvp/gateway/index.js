import fs from "fs";
import path from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";

import { ApolloServer, gql } from "apollo-server";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const typeDefs = gql(fs.readFileSync(path.join(__dirname, "schema.graphql"), "utf8"));

// Provide resolver mocks for a runnable server
const resolvers = {
  Query: {
    entityById: () => ({
      id: "person-1",
      tenant: "dev-tenant",
      labels: ["Person"],
      name: "Alice",
    }),
    searchEntities: () => [
      {
        id: "person-1",
        tenant: "dev-tenant",
        labels: ["Person"],
        name: "Alice",
      },
    ],
    neighbors: () => [],
  },
  Entity: {
    __resolveType(obj, _context, _info) {
      if (obj.name) {
        return "Person";
      }
      return null;
    },
  },
};

const server = new ApolloServer({ typeDefs, resolvers });

server.listen({ port: 4000 }).then(({ url }) => {
  process.stdout.write(`🚀 Gateway ready at ${url}\n`);
});
