"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaticIdentityVerifier = void 0;
class StaticIdentityVerifier {
    expectedTokens;
    constructor(expectedTokens) {
        this.expectedTokens = expectedTokens;
    }
    async verify(request) {
        const expected = this.expectedTokens[request.subjectId];
        const provided = request.identityProof?.token;
        const verified = Boolean(expected && provided && expected === provided);
        return {
            verified,
            reason: verified ? undefined : 'identity token mismatch',
            verifierId: 'static-fixture',
            proofMethod: request.identityProof?.method,
        };
    }
}
exports.StaticIdentityVerifier = StaticIdentityVerifier;
