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

