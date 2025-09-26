export const jwtIssuer = process.env.JWT_ISSUER || 'intelgraph';

// Legacy PBAC role hints are maintained for backward compatibility but dynamic RBAC
// lookups are now served from PostgreSQL through the RbacService. Leaving this empty
// ensures legacy code does not accidentally rely on stale static permissions.
export const pbacRoles: Record<string, string[]> = {};
