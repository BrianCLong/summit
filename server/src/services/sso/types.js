"use strict";
/**
 * SSO Types for SAML and OIDC providers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SAML = void 0;
class SAML {
    constructor(_config) { }
    getAuthorizeUrl(_options) {
        throw new Error('SAML library not implemented');
    }
    validatePostResponse(_body) {
        throw new Error('SAML library not implemented');
    }
    validatePostResponseAsync(_request) {
        throw new Error('SAML library not implemented');
    }
}
exports.SAML = SAML;
