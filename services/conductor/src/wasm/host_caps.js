"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hostCaps = hostCaps;
function hostCaps(capsToken) {
    const claims = verifyCapToken(capsToken);
    return {
        cas_read: async (digest) => {
            if (!claims.caps.includes('cas.read'))
                throw new Error('cap missing'); /* fetch & stream */
        },
        cas_write: async (bytes) => {
            if (!claims.caps.includes('cas.write'))
                throw new Error('cap missing'); /* putCAS using DEK */
        },
    };
}
