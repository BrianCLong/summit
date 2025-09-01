export const typeDefs = `#graphql
  type Watchlist { id: ID!, name: String!, items: [String!]!, owners: [String!]! }
  type Rule { id: ID!, watchlistId: ID!, name: String!, enabled: Boolean!, threshold: Int! }
  type Alert { id: ID!, ruleId: ID!, entityId: ID, score: Int!, status: String!, reason: [String!]!, createdAt: String! }

  type Query {
    watchlists: [Watchlist!]!
    alerts: [Alert!]!
  }

  input WatchlistInput { name: String!, items: [String!]!, owners: [String!]! }
  input RuleInput { watchlistId: ID!, name: String!, enabled: Boolean!, threshold: Int! }

  type Mutation {
    createWatchlist(input: WatchlistInput!): Watchlist!
    upsertRule(input: RuleInput!): Rule!
    ackAlert(id: ID!): Alert
    closeAlert(id: ID!): Alert
  }
`;
const watchlists = [];
const rules = [];
const alerts = [];
export const resolvers = {
    Query: {
        watchlists: () => watchlists,
        alerts: () => alerts,
    },
    Mutation: {
        createWatchlist: (_, { input }) => {
            const watchlist = {
                id: `w${watchlists.length + 1}`,
                name: input.name,
                scope: { tenantId: 'demo' },
                items: input.items.map((value) => ({ value })),
                owners: input.owners,
                severityWeights: {},
                createdAt: new Date(),
            };
            watchlists.push(watchlist);
            return watchlist;
        },
        upsertRule: (_, { input }) => {
            const existing = rules.find((r) => r.id === input.id);
            if (existing) {
                Object.assign(existing, input);
                return existing;
            }
            const rule = {
                id: `r${rules.length + 1}`,
                watchlistId: input.watchlistId,
                name: input.name,
                enabled: input.enabled,
                trigger: 'INGEST',
                selector: {},
                window: 60 * 1000,
                threshold: input.threshold,
            };
            rules.push(rule);
            return rule;
        },
        ackAlert: (_, { id }) => {
            const alert = alerts.find((a) => a.id === id);
            if (alert) {
                alert.status = 'ACK';
            }
            return alert;
        },
        closeAlert: (_, { id }) => {
            const alert = alerts.find((a) => a.id === id);
            if (alert) {
                alert.status = 'CLOSED';
            }
            return alert;
        },
    },
};
//# sourceMappingURL=watchlists.js.map