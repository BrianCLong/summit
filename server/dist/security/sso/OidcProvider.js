export class OidcProvider {
    constructor(config) {
        this.config = config;
    }
    async fetchKeys() {
        const res = await fetch(`${this.config.issuer}/.well-known/jwks.json`);
        if (!res.ok)
            throw new Error('jwks fetch failed');
        const { keys } = await res.json();
        return keys;
    }
    mapRoles(token) {
        const mapped = [];
        for (const r of token.roles || []) {
            const local = this.config.roles[r];
            if (local)
                mapped.push(...local);
        }
        return mapped;
    }
}
//# sourceMappingURL=OidcProvider.js.map