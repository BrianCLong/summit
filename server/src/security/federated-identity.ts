import { XMLParser } from 'fast-xml-parser';
import { DOMParser } from '@xmldom/xmldom';
import { SignedXml } from 'xml-crypto';
import crypto from 'crypto';
import baseLogger from '../utils/logger.js';

const logger = baseLogger.child({ component: 'federated-identity' });

export interface FederatedIdentityUser {
  id: string;
  sub: string;
  email: string;
  role: string;
  roles: string[];
  tenantId?: string;
  orgId?: string;
  teamId?: string;
  identityProvider: string;
  federated: boolean;
  isActive: boolean;
  attributes: Record<string, string[]>;
}

interface SamlAssertion {
  assertion: any;
  attributes: Record<string, string[]>;
  issuer: string;
  nameId: string;
  audience: string | null;
  notOnOrAfter?: Date;
  issueInstant?: Date;
}

const ROLE_ATTRIBUTE = process.env.SAML_ROLE_ATTRIBUTE ||
  'http://schemas.xmlsoap.org/claims/Group';
const DEFAULT_ROLE = (process.env.SAML_DEFAULT_ROLE || 'viewer').toUpperCase();
const ROLE_MAPPINGS = parseRoleMapping(process.env.SAML_ROLE_MAPPINGS || '');

function parseRoleMapping(raw: string): Record<string, string> {
  return raw
    .split(/[;,]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, entry) => {
      const [idpRole, localRole] = entry.split(/[:=]/).map((value) => value?.trim());
      if (idpRole && localRole) {
        acc[idpRole] = localRole.toUpperCase();
      }
      return acc;
    }, {});
}

function decodeAssertion(raw: string): string {
  try {
    const trimmed = raw.trim();
    return Buffer.from(trimmed, 'base64').toString('utf8');
  } catch (error) {
    throw new Error('Unable to decode SAML assertion');
  }
}

function parseAssertion(xml: string): SamlAssertion {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const parsed = parser.parse(xml);

  const assertion =
    parsed['saml2:Assertion'] ||
    parsed['saml:Assertion'] ||
    parsed.Assertion ||
    parsed['saml:Assertion'];

  if (!assertion) {
    throw new Error('Missing Assertion element in SAML payload');
  }

  const issuer = assertion.Issuer?.['#text'] || assertion.Issuer || parsed['saml2:Issuer'];
  if (!issuer) {
    throw new Error('Missing Issuer in SAML assertion');
  }

  const subject = assertion.Subject || {};
  const nameIdValue = subject.NameID?.['#text'] || subject.NameID || subject['saml2:NameID'];
  if (!nameIdValue) {
    throw new Error('Missing NameID in SAML assertion subject');
  }

  const conditions = assertion.Conditions || assertion['saml2:Conditions'] || {};
  const audienceRestriction =
    conditions.AudienceRestriction ||
    conditions['saml2:AudienceRestriction'] ||
    conditions['saml:AudienceRestriction'];

  const audience = audienceRestriction?.Audience?.['#text'] ||
    audienceRestriction?.Audience ||
    audienceRestriction?.['saml2:Audience'] ||
    null;

  const notOnOrAfterValue =
    conditions['@_NotOnOrAfter'] ||
    audienceRestriction?.SubjectConfirmationData?.['@_NotOnOrAfter'] ||
    subject.SubjectConfirmation?.SubjectConfirmationData?.['@_NotOnOrAfter'];

  const issueInstantValue = assertion['@_IssueInstant'];

  const attributeStatement =
    assertion['saml2:AttributeStatement'] ||
    assertion['saml:AttributeStatement'] ||
    assertion.AttributeStatement;

  if (!attributeStatement) {
    throw new Error('Missing AttributeStatement in SAML assertion');
  }

  const rawAttributes =
    attributeStatement['saml2:Attribute'] ||
    attributeStatement['saml:Attribute'] ||
    attributeStatement.Attribute ||
    [];

  const attributeArray = Array.isArray(rawAttributes) ? rawAttributes : [rawAttributes];

  const attributes: Record<string, string[]> = {};
  for (const attribute of attributeArray) {
    const name = attribute['@_Name'] || attribute['@_FriendlyName'] || attribute.Name;
    if (!name) {
      continue;
    }
    const valuesRaw =
      attribute['saml2:AttributeValue'] ||
      attribute['saml:AttributeValue'] ||
      attribute.AttributeValue ||
      [];
    const values = Array.isArray(valuesRaw) ? valuesRaw : [valuesRaw];
    attributes[name] = values
      .map((value) => {
        if (value == null) return undefined;
        if (typeof value === 'string') return value;
        if (typeof value === 'object') {
          return value['#text'] || value['#'] || Object.values(value)[0];
        }
        return String(value);
      })
      .filter((value): value is string => Boolean(value))
      .map((value) => value.trim());
  }

  return {
    assertion,
    attributes,
    issuer,
    nameId: nameIdValue,
    audience,
    notOnOrAfter: notOnOrAfterValue ? new Date(notOnOrAfterValue) : undefined,
    issueInstant: issueInstantValue ? new Date(issueInstantValue) : undefined,
  };
}

function validateAudience(audience: string | null): void {
  const expectedAudience = process.env.SAML_AUDIENCE || process.env.SAML_SP_ENTITY_ID;
  if (expectedAudience && audience && audience !== expectedAudience) {
    throw new Error('SAML assertion audience does not match service configuration');
  }
}

function validateTimestamps(assertion: SamlAssertion): void {
  const now = new Date();
  const skewAllowance = Number(process.env.SAML_CLOCK_TOLERANCE_SECONDS || 120);

  if (assertion.issueInstant) {
    const earliest = new Date(now.getTime() - skewAllowance * 1000);
    if (assertion.issueInstant < earliest) {
      throw new Error('SAML assertion has expired IssueInstant');
    }
  }

  if (assertion.notOnOrAfter && assertion.notOnOrAfter < now) {
    throw new Error('SAML assertion has expired (NotOnOrAfter)');
  }
}

function validateSignature(xml: string): void {
  const requireSignature = (process.env.SAML_REQUIRE_SIGNED_ASSERTIONS || 'true') === 'true';
  const certificate = process.env.SAML_IDP_CERT?.trim();

  if (!requireSignature) {
    if (!certificate) {
      logger.warn('SAML signature validation disabled and no certificate provided');
    }
    return;
  }

  if (!certificate) {
    throw new Error('SAML signature validation required but no IdP certificate configured');
  }

  const dom = new DOMParser().parseFromString(xml, 'text/xml');
  const signatures = dom.getElementsByTagName('Signature');
  if (!signatures || signatures.length === 0) {
    throw new Error('SAML assertion missing XML Digital Signature');
  }

  const signature = new SignedXml();
  signature.keyInfoProvider = {
    getKeyInfo: () => '<X509Data></X509Data>',
    getKey: () => certificate,
  };

  signature.loadSignature(signatures[0]);
  if (!signature.checkSignature(xml)) {
    throw new Error('SAML assertion signature validation failed');
  }
}

function mapRoles(attributes: Record<string, string[]>): { role: string; roles: string[] } {
  const mappedRoles = new Set<string>();
  const incomingRoles = attributes[ROLE_ATTRIBUTE] || [];

  for (const incoming of incomingRoles) {
    const mapped = ROLE_MAPPINGS[incoming] || incoming;
    if (mapped) {
      mappedRoles.add(mapped.toUpperCase());
    }
  }

  if (mappedRoles.size === 0) {
    mappedRoles.add(DEFAULT_ROLE);
  }

  const roles = Array.from(mappedRoles);
  const primaryRole = roles[0] || DEFAULT_ROLE;

  return { role: primaryRole, roles };
}

function extractTenantId(attributes: Record<string, string[]>): string | undefined {
  const keys = ['tenantId', 'tenant_id', 'tenant', 'Tenant', 'TenantID'];
  for (const key of keys) {
    const values = attributes[key];
    if (values && values.length > 0) {
      return values[0];
    }
  }
  return undefined;
}

function extractOrgId(attributes: Record<string, string[]>): string | undefined {
  const keys = ['orgId', 'organization', 'Org', 'OrgID'];
  for (const key of keys) {
    const values = attributes[key];
    if (values && values.length > 0) {
      return values[0];
    }
  }
  return undefined;
}

function extractTeamId(attributes: Record<string, string[]>): string | undefined {
  const keys = ['teamId', 'team', 'TeamID'];
  for (const key of keys) {
    const values = attributes[key];
    if (values && values.length > 0) {
      return values[0];
    }
  }
  return undefined;
}

export function federatedUserFromSaml(assertionRaw: string): FederatedIdentityUser {
  const xml = decodeAssertion(assertionRaw);
  validateSignature(xml);
  const assertion = parseAssertion(xml);
  validateAudience(assertion.audience);
  validateTimestamps(assertion);

  const email =
    assertion.attributes.email?.[0] ||
    assertion.attributes.mail?.[0] ||
    assertion.attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress']?.[0] ||
    assertion.nameId;

  if (!email) {
    throw new Error('SAML assertion missing email attribute');
  }

  const { role, roles } = mapRoles(assertion.attributes);
  const tenantId = extractTenantId(assertion.attributes);
  const orgId = extractOrgId(assertion.attributes);
  const teamId = extractTeamId(assertion.attributes);

  const subjectId =
    assertion.attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier']?.[0] ||
    assertion.attributes.uid?.[0] ||
    assertion.nameId;

  const deterministicId = crypto.createHash('sha256').update(subjectId).digest('hex');

  return {
    id: deterministicId,
    sub: subjectId,
    email,
    role,
    roles,
    tenantId,
    orgId,
    teamId,
    identityProvider: 'saml',
    federated: true,
    isActive: true,
    attributes: assertion.attributes,
  };
}

export function parseFederatedRoleMapping(): Record<string, string> {
  return { ...ROLE_MAPPINGS };
}
