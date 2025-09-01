import fetch from 'node-fetch';
export function createContext(opts) {
    return {
        tenantId: opts.tenantId,
        allowlist: opts.allowlist,
        secrets: opts.secrets || {},
        log: () => { },
        rateLimit: async () => {
            return;
        },
        http: async (url, opts2 = {}) => {
            const host = new URL(url).host;
            if (!opts.allowlist.includes(host)) {
                throw new Error('egress blocked');
            }
            return fetch(url, opts2);
        },
    };
}
//# sourceMappingURL=ConnectorSDK.js.map