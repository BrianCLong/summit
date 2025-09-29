// Stubs to keep schema valid on day 1; teams fill their own files only.
import * as core from './core/resolvers';
import * as collab from './collab/resolvers';
import * as analytics from './analytics/resolvers';
import * as security from './security/resolvers';
import * as exporting from './exporting/resolvers';
import * as observability from './observability/resolvers';

// Minimal base so schema compiles even before teams implement
export const typeDefs = [
  (await import('./core/typeDefs')).default,
  (await import('./collab/typeDefs')).default,
  (await import('./analytics/typeDefs')).default,
  (await import('./security/typeDefs')).default,
  (await import('./exporting/typeDefs')).default,
  (await import('./observability/typeDefs')).default,
];

export const resolvers = {
  Query: {
    ...(core.Query || {}),
    ...(analytics.Query || {}),
    ...(security.Query || {}),
    ...(exporting.Query || {}),
    ...(observability.Query || {}),
    ...(collab.Query || {}),
  },
  Mutation: {
    ...(core.Mutation || {}),
    ...(analytics.Mutation || {}),
    ...(security.Mutation || {}),
    ...(exporting.Mutation || {}),
    ...(observability.Mutation || {}),
    ...(collab.Mutation || {}),
  },
  Subscription: {
    ...(collab.Subscription || {}),
  },
};
