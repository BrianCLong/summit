"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SAMLProvider = void 0;
const types_js_1 = require("./types.js");
class SAMLProvider {
    saml;
    config;
    constructor(config) {
        this.config = config;
        this.saml = new types_js_1.SAML({
            entryPoint: config.entryPoint,
            issuer: config.issuerString || config.issuer,
            cert: config.cert,
            callbackUrl: config.callbackUrl || '',
            privateKey: config.privateKey,
            decryptionPvk: config.decryptionPvk,
            signatureAlgorithm: config.signatureAlgorithm,
        });
    }
    validateConfig() {
        if (!this.config.entryPoint)
            throw new Error('Missing entryPoint for SAML');
        if (!this.config.cert)
            throw new Error('Missing cert for SAML');
    }
    async generateAuthUrl(callbackUrl, relayState) {
        // Generate SAML auth redirect URL
        return this.saml.getAuthorizeUrl({ RelayState: relayState });
    }
    async handleCallback(callbackUrl, body, query) {
        const validatePostResponse = await this.saml.validatePostResponseAsync({ body });
        const { profile } = validatePostResponse;
        if (!profile) {
            throw new Error('SAML validation failed: No profile returned');
        }
        const email = profile.email || profile.nameID || profile['urn:oid:0.9.2342.19200300.100.1.3']; // Common email OID
        if (!email) {
            throw new Error('SAML validation failed: No email found in assertion');
        }
        // Map attributes
        const attributes = profile.attributes || {};
        const firstName = attributes[this.config.attributeMap?.firstName || 'firstName'] ||
            attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'];
        const lastName = attributes[this.config.attributeMap?.lastName || 'lastName'] ||
            attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname'];
        let groups = [];
        const groupAttr = this.config.attributeMap?.groups || 'groups';
        const rawGroups = attributes[groupAttr] || attributes['http://schemas.xmlsoap.org/claims/Group'];
        if (Array.isArray(rawGroups)) {
            groups = rawGroups.map(g => String(g));
        }
        else if (typeof rawGroups === 'string') {
            groups = [rawGroups];
        }
        // Role mapping
        const roles = [];
        if (this.config.groupMap) {
            for (const group of groups) {
                const mapped = this.config.groupMap[group];
                if (mapped)
                    roles.push(...mapped);
            }
        }
        if (roles.length === 0)
            roles.push('VIEWER');
        return {
            id: String(profile.nameID),
            email: String(email),
            firstName: firstName ? String(firstName) : undefined,
            lastName: lastName ? String(lastName) : undefined,
            groups,
            roles: Array.from(new Set(roles)),
            provider: 'saml',
            attributes: profile
        };
    }
}
exports.SAMLProvider = SAMLProvider;
