
import { SSOProvider, SSOConfig, SSOUser } from './types.js';
import { SAML, SamlConfig } from '@node-saml/node-saml';
import logger from '../../utils/logger.js';

export class SAMLProvider implements SSOProvider {
  private saml: SAML;
  private config: SSOConfig;

  constructor(config: SSOConfig) {
    this.config = config;
    this.saml = new SAML({
      entryPoint: config.entryPoint,
      issuer: config.issuerString,
      cert: config.cert,
      privateKey: config.privateKey,
      decryptionPvk: config.decryptionPvk,
      signatureAlgorithm: config.signatureAlgorithm || 'sha256',
      audience: config.issuerString, // Often used as EntityID
      disableRequestedAuthnContext: true, // often necessary for compatibility
      identifierFormat: null,
      acceptedClockSkewMs: 30000, // 30s skew
    } as SamlConfig);
  }

  validateConfig(): void {
    if (!this.config.entryPoint) throw new Error('Missing entryPoint for SAML');
    if (!this.config.cert) throw new Error('Missing cert for SAML');
  }

  async generateAuthUrl(callbackUrl: string, relayState?: string): Promise<string> {
    // node-saml generates the redirect URL
    return new Promise((resolve, reject) => {
      this.saml.getAuthorizeUrl(
        {
          headers: {},
          body: {},
          query: { RelayState: relayState },
        },
        { additionalParams: { RelayState: relayState } },
        (err, url) => {
          if (err) return reject(err);
          if (!url) return reject(new Error('Failed to generate auth URL'));
          resolve(url);
        }
      );
    });
  }

  async handleCallback(callbackUrl: string, body: any, query: any): Promise<SSOUser> {
    const validatePostResponse = await this.saml.validatePostResponseAsync({ body } as any);
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

    let groups: string[] = [];
    const groupAttr = this.config.attributeMap?.groups || 'groups';
    const rawGroups = attributes[groupAttr] || attributes['http://schemas.xmlsoap.org/claims/Group'];

    if (Array.isArray(rawGroups)) {
      groups = rawGroups.map(g => String(g));
    } else if (typeof rawGroups === 'string') {
      groups = [rawGroups];
    }

    // Role mapping
    const roles: string[] = [];
    if (this.config.groupMap) {
      for (const group of groups) {
        const mapped = this.config.groupMap[group];
        if (mapped) roles.push(...mapped);
      }
    }
    if (roles.length === 0) roles.push('VIEWER');

    return {
      email: String(email),
      firstName: firstName ? String(firstName) : undefined,
      lastName: lastName ? String(lastName) : undefined,
      groups,
      roles: Array.from(new Set(roles)),
      provider: 'saml',
      providerId: String(profile.nameID),
      attributes: profile
    };
  }
}
