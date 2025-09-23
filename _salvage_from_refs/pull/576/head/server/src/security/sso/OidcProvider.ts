export interface OidcConfig {
  issuer: string;
  clientId: string;
  roles: Record<string, string[]>;
}

export class OidcProvider {
  constructor(private config: OidcConfig) {}

  async fetchKeys() {
    const res = await fetch(`${this.config.issuer}/.well-known/jwks.json`);
    if (!res.ok) throw new Error('jwks fetch failed');
    const { keys } = await res.json();
    return keys;
  }

  mapRoles(token: { roles?: string[] }) {
    const mapped: string[] = [];
    for (const r of token.roles || []) {
      const local = this.config.roles[r];
      if (local) mapped.push(...local);
    }
    return mapped;
  }
}
