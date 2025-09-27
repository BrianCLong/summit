import type { MakeServerOptions } from '../../src/app/makeServer';
import { makeGraphServer } from '../../src/app/makeServer';

export function tenant(id: string) {
  return { tenant: id } as Pick<MakeServerOptions, 'tenant'>;
}

export function scopes(list: string[]) {
  return { scopes: list } as Pick<MakeServerOptions, 'scopes'>;
}

export function role(name: string) {
  return { role: name } as Pick<MakeServerOptions, 'role'>;
}

export async function makeUnitServer(opts: MakeServerOptions = {}) {
  return makeGraphServer(opts);
}

// Sugar helpers for common patterns
export function unitAdmin(tenantId = 'test-tenant') {
  return { tenant: tenantId, role: 'ADMIN', scopes: ['*'] } as MakeServerOptions;
}

export function unitUserWithScopes(scopesList: string[], tenantId = 'test-tenant') {
  return { tenant: tenantId, role: 'ANALYST', scopes: scopesList } as MakeServerOptions;
}

export function unitTenant(id: string) {
  return { tenant: id } as MakeServerOptions;
}

export function unitAnalyst(tenantId = 'test-tenant') {
  return { tenant: tenantId, role: 'ANALYST', scopes: ['graph:read'] } as MakeServerOptions;
}
