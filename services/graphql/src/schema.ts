import { ApolloServer } from ' @apollo/server';
import { startStandaloneServer } from ' @apollo/server/standalone';
import fetch from 'node-fetch';

const typeDefs = `#graphql
scalar JSON
type Account { id: ID!, source: String!, eigenvector: Float, betweenness: Float, community: Int }
type Edge { a: ID!, b: ID!, score: Float! }
type Case { id: ID!, reason: String!, created: String!, nodes: [Account!]!, summary: String }
type Query {
  account(id: ID!): Account
  coordinationEdges(a: ID!, minScore: Float = 3.0): [Edge!]!
  communities(minSize: Int = 5): [JSON!]!
  case(id: ID!): Case
  bundleExport(id: ID!): String # URL to download bundle
}
type Mutation {
  createCaseFromSeeds(seeds: [ID!]!, reason: String!): Case!
  summarizeCase(id: ID!): Case!
}
`;

const resolvers = {
  Query: {
    account: async (_:any, {id}:{id:string}) => (await fetch(`${process.env.API_BASE_URL}/accounts/${id}`)).json(),
    coordinationEdges: async (_:any, {a,minScore}:{a:string,minScore:number}) =>
      (await fetch(`${process.env.API_BASE_URL}/coord/edges?a=${a}&min=${minScore}`)).json(),
    communities: async (_:any, {minSize}:{minSize:number}) =>
      (await fetch(`${process.env.API_BASE_URL}/coord/communities?minSize=${minSize}`)).json(),
    case: async (_:any, {id}:{id:string}) =>
      (await fetch(`${process.env.API_BASE_URL}/cases/${id}`)).json(),
    bundleExport: async (_:any, {id}:{id:string}) => `${process.env.API_BASE_URL}/exports/bundle/${id}`
  },
  Mutation: {
    createCaseFromSeeds: async (_:any, {seeds,reason}:{seeds:string[],reason:string}) =>
      (await fetch(`${process.env.API_BASE_URL}/cases/autocreate`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({seed_accounts:seeds,reason})})).json(),
    summarizeCase: async (_:any, {id}:{id:string}) =>
      (await fetch(`${process.env.API_BASE_URL}/cases/${id}/summarize`, {method:'POST'})).json()
  }
};

const server = new ApolloServer({ typeDefs, resolvers });
startStandaloneServer(server, { listen: { port: 4000 } });