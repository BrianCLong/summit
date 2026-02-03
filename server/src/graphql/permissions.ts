// @ts-nocheck
import { shield, rule, and, or, not, allow } from './shield.js';
import type { GraphQLContext } from './apollo-v5-server.js';

// Rules
const isAuthenticated = rule({ cache: 'contextual' })(
  async (parent: unknown, args: unknown, ctx: GraphQLContext, info: unknown) => {
    return ctx.user !== null && ctx.user !== undefined;
  }
);

const isAdmin = rule({ cache: 'contextual' })(
  async (parent: unknown, args: unknown, ctx: GraphQLContext, info: unknown) => {
    return ctx.user?.roles?.includes('admin') || false;
  }
);

// Permissions
export const permissions = shield({
  Query: {
    health: allow, // Public
    version: allow, // Public
    _empty: allow,

    // Admin features
    listPersistedQueries: and(isAuthenticated, isAdmin),

    // Default fallback for other queries
    '*': isAuthenticated,
  },
  Mutation: {
    _empty: allow,

    // Admin features
    upsertPersistedQuery: and(isAuthenticated, isAdmin),
    deletePersistedQuery: and(isAuthenticated, isAdmin),

    // Default fallback
    '*': isAuthenticated,
  },
}, {
  fallbackRule: isAuthenticated,
  allowExternalErrors: true,
  fallbackError: new Error('Not Authorised!'),
  debug: process.env.NODE_ENV !== 'production'
});
