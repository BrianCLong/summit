const crypto = require('node:crypto');
const express = require('express');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const bodyParser = require('body-parser');
const { Flags } = require('../../../../libs/ops/src/flags.js');
const { metricsMiddleware } = require('../../../../libs/ops/src/observe.js');

class InMemoryLedger {
  constructor() {
    this.evidence = new Map();
    this.claims = new Map();
  }

  addEvidence(input) {
    const sha256 = (input.sha256 || '').trim();
    const contentType = (input.contentType || '').trim();
    if (!sha256 || !contentType) {
      throw new Error('sha256 and contentType are required');
    }
    if (!/^[a-fA-F0-9]{64}$/.test(sha256)) {
      throw new Error('sha256 must be a 64 character hex string');
    }
    const id = crypto.randomUUID();
    const evidence = { id, sha256, contentType, createdAt: new Date().toISOString() };
    this.evidence.set(id, evidence);
    return evidence;
  }

  addClaim(input) {
    const evidenceIds = [...new Set(input.evidenceIds || [])].filter((id) => id && id.trim());
    const transformChain = (input.transformChain || []).map((step) => step.trim()).filter(Boolean);
    if (!evidenceIds.length) {
      throw new Error('At least one evidenceId is required');
    }
    if (transformChain.length === 0) {
      throw new Error('transformChain is required');
    }
    const missing = evidenceIds.filter((id) => !this.evidence.has(id));
    if (missing.length) {
      throw new Error(`Unknown evidence ids: ${missing.join(',')}`);
    }
    const hashRoot = crypto.createHash('sha256').update(JSON.stringify({ evidenceIds, transformChain })).digest('hex');
    const claim = { id: crypto.randomUUID(), evidenceIds, transformChain, hashRoot };
    this.claims.set(claim.id, claim);
    return claim;
  }

  manifest(caseId) {
    const id = (caseId || '').trim();
    if (!id) {
      throw new Error('caseId is required');
    }
    return {
      caseId: id,
      evidence: [...this.evidence.values()],
      claims: [...this.claims.values()],
      createdAt: new Date().toISOString(),
    };
  }
}

const typeDefs = /* GraphQL */ `
  type ProvEvidence {
    id: ID!
    sha256: String!
    contentType: String!
    createdAt: String!
  }
  type ProvClaim {
    id: ID!
    evidenceIds: [ID!]!
    transformChain: [String!]!
    hashRoot: String!
  }
  type Query {
    prov_manifest(caseId: ID!): String!
  }
  type Mutation {
    prov_addEvidence(sha256: String!, contentType: String!): ProvEvidence!
    prov_addClaim(evidenceIds: [ID!]!, transformChain: [String!]!): ProvClaim!
  }
`;

const createResolvers = () => ({
  Query: {
    prov_manifest: (_parent, args, ctx) => {
      const manifest = ctx.ledger.manifest(args.caseId);
      return Buffer.from(JSON.stringify(manifest)).toString('base64');
    },
  },
  Mutation: {
    prov_addEvidence: (_parent, args, ctx) => ctx.ledger.addEvidence(args),
    prov_addClaim: (_parent, args, ctx) => ctx.ledger.addClaim(args),
  },
});

const toErrorResponse = (error) => (error instanceof Error ? error.message : 'Unexpected error');

async function buildProvLedgerApp({ ledger = new InMemoryLedger(), serviceName = 'prov-ledger' } = {}) {
  if (!Flags.provLedger) {
    throw new Error('prov-ledger disabled by feature flag');
  }
  const app = express();
  app.use(bodyParser.json());
  app.use(metricsMiddleware(serviceName));

  app.post('/ledger/evidence', (req, res) => {
    try {
      const evidence = ledger.addEvidence({ sha256: req.body?.sha256 ?? '', contentType: req.body?.contentType ?? '' });
      res.status(201).json(evidence);
    } catch (error) {
      res.status(400).json({ error: toErrorResponse(error) });
    }
  });

  app.get('/ledger/export/:caseId', (req, res) => {
    try {
      const manifest = ledger.manifest(req.params.caseId);
      res.json({ manifest: Buffer.from(JSON.stringify(manifest)).toString('base64'), caseId: manifest.caseId });
    } catch (error) {
      res.status(400).json({ error: toErrorResponse(error) });
    }
  });

  const apollo = new ApolloServer({ typeDefs, resolvers: createResolvers() });
  await apollo.start();
  app.use('/graphql', expressMiddleware(apollo, { context: async () => ({ ledger }) }));

  return { app, ledger, apollo };
}

module.exports = { buildProvLedgerApp, InMemoryLedger };
