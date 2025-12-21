import { gql } from 'apollo-server';
import { GraphQLScalarType, Kind } from 'graphql';
import { Ledger } from './ledger';

const ledger = new Ledger();

const JsonScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'Arbitrary JSON value',
  serialize: (value) => value,
  parseValue: (value) => value,
  parseLiteral: (ast) => {
    if (ast.kind === Kind.STRING || ast.kind === Kind.BOOLEAN) return ast.value;
    if (ast.kind === Kind.INT || ast.kind === Kind.FLOAT) return Number(ast.value);
    if (ast.kind === Kind.OBJECT) {
      const obj: Record<string, unknown> = {};
      ast.fields.forEach((f) => {
        obj[f.name.value] = (f.value as any).value;
      });
      return obj;
    }
    if (ast.kind === Kind.LIST) return ast.values.map((v) => (v as any).value);
    return null;
  },
});

export const typeDefs = gql`
  scalar JSON
  type Evidence { id: ID!, hash: String!, metadata: String, licenseTags: [String!]!, lineage: JSON! }
  type Claim { id: ID!, evidenceIds: [ID!]!, statement: String!, licenseTags: [String!]! }
  type Manifest { id: ID!, claimId: ID!, merkleRoot: String!, createdAt: String!, licenseTags: [String!]!, lineage: JSON!, leaves: [String!]! }
  type Query {
    _health: String!
    manifest(id: ID!): Manifest
  }
  input EvidenceInput { hash: String!, metadata: String, licenseTags: [String!], lineage: JSON }
  input ClaimInput { statement: String!, evidenceIds: [ID!]!, licenseTags: [String!] }
  type Mutation {
    registerEvidence(input: EvidenceInput!): Evidence!
    registerClaim(input: ClaimInput!): Claim!
    sealManifest(claimId: ID!): Manifest!
  }
`;

export const resolvers = {
  JSON: JsonScalar,
  Query: {
    _health: () => 'ok',
    manifest: (_: unknown, { id }: { id: string }) => ledger.getManifest(id) ?? null,
  },
  Mutation: {
    registerEvidence: (_: unknown, { input }: { input: any }) => ledger.registerEvidence(input),
    registerClaim: (_: unknown, { input }: { input: any }) => ledger.registerClaim(input.statement, input.evidenceIds, input.licenseTags),
    sealManifest: (_: unknown, { claimId }: { claimId: string }) => ledger.sealManifest(claimId),
  },
};
