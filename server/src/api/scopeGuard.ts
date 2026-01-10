
// src/api/scopeGuard.ts
export type Scope =
  | 'read:graph'
  | 'write:case'
  | 'run:analytics'
  | 'export:bundle'
  | 'manage:keys';

export function checkScope(userScopes: string[], scope: string): boolean {
  if (userScopes.includes(scope)) return true;
  // Check for wildcard scope
  const [resource] = scope.split(':');
  if (userScopes.includes(`${resource}:*`)) return true;
  return false;
}

export function requireScopes(userScopes: string[], needed: Scope[]) {
  for (const s of needed) {
    if (!checkScope(userScopes, s)) {
      const err: any = new Error(`SCOPE_DENIED:${s}`);
      err.code = 'SCOPE_DENIED';
      throw err;
    }
  }
}
