// Core-only shims: declare specific modules used by src/app.ts to avoid deep type traversal

// Monitoring metrics (named exports are used)
declare module './monitoring/metrics.js' {
  export const register: any;
  export const graphqlResolverDurationSeconds: any;
  export const graphqlResolverErrorsTotal: any;
  export const graphqlResolverCallsTotal: any;
  export const mcpInvocationsTotal: any;
  export const mcpSessionsTotal: any;
  const _default: any;
  export default _default;
}

// GraphQL schema and resolvers used by app
declare module './graphql/schema.js' {
  export const typeDefs: any;
}

declare module './graphql/resolvers/index.js' {
  const resolvers: any;
  export default resolvers;
}

// Middleware and routes used by app
declare module './middleware/audit-logger.js' {
  export const auditLogger: any;
  const _default: any;
  export default _default;
}

declare module './routes/monitoring.js' {
  const router: any;
  export default router;
}

declare module './routes/ai.js' {
  const router: any;
  export default router;
}

declare module './routes/disclosures.js' {
  const router: any;
  export default router;
}

declare module './routes/narrative-sim.js' {
  const router: any;
  export default router;
}

declare module './routes/rbacRoutes.js' {
  const router: any;
  export default router;
}

// DB and auth helpers
declare module './db/neo4j.js' {
  export function getNeo4jDriver(): any;
}

declare module './lib/auth.js' {
  export const getContext: any;
}

// Apollo plugins referenced in app.ts
declare module './graphql/plugins/persistedQueries.js' {
  export const persistedQueriesPlugin: any;
}

declare module './graphql/plugins/pbac.js' {
  const plugin: any;
  export default plugin;
}

declare module './graphql/plugins/resolverMetrics.js' {
  const plugin: any;
  export default plugin;
}

declare module './graphql/plugins/auditLogger.js' {
  const plugin: any;
  export default plugin;
}

declare module './graphql/validation/depthLimit.js' {
  export function depthLimit(n: number): any;
}

// Production security helpers
declare module './config/production-security.js' {
  export const productionAuthMiddleware: any;
  export const applyProductionSecurity: any;
  export const graphqlSecurityConfig: any;
}
