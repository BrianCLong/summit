import express from 'express';
import request from 'supertest';
import { ensureAuthenticated } from '../src/middleware/auth.js';

const samlEnvKeys = [
  'SAML_ENABLED',
  'SAML_REQUIRE_SIGNED_ASSERTIONS',
  'SAML_AUDIENCE',
  'SAML_SP_ENTITY_ID',
  'SAML_ROLE_ATTRIBUTE',
  'SAML_ROLE_MAPPINGS',
  'SAML_DEFAULT_ROLE',
  'SAML_CLOCK_TOLERANCE_SECONDS',
];

const originalEnv: Record<string, string | undefined> = {};

beforeAll(() => {
  for (const key of samlEnvKeys) {
    originalEnv[key] = process.env[key];
  }

  process.env.SAML_REQUIRE_SIGNED_ASSERTIONS = 'false';
  process.env.SAML_AUDIENCE = 'urn:intelgraph:api';
  process.env.SAML_SP_ENTITY_ID = 'urn:intelgraph:api';
  process.env.SAML_ROLE_ATTRIBUTE = 'http://schemas.xmlsoap.org/claims/Group';
  process.env.SAML_ROLE_MAPPINGS = 'OneLogin_Admin=ADMIN,OneLogin_Analyst=ANALYST';
  process.env.SAML_DEFAULT_ROLE = 'viewer';
  process.env.SAML_CLOCK_TOLERANCE_SECONDS = '300';
  process.env.SAML_ENABLED = 'true';
});

afterAll(() => {
  for (const key of samlEnvKeys) {
    const value = originalEnv[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

function buildSamlAssertion(options: { audience?: string; groups?: string[]; tenant?: string }): string {
  const now = new Date();
  const notOnOrAfter = new Date(now.getTime() + 5 * 60 * 1000);
  const issueInstant = now.toISOString();
  const audience = options.audience ?? 'urn:intelgraph:api';
  const groups = options.groups ?? ['OneLogin_Analyst'];
  const tenant = options.tenant ?? 'tenant-1';

  const attributeValues = groups
    .map((group) => `<saml2:AttributeValue>${group}</saml2:AttributeValue>`)
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <saml2:Assertion xmlns:saml2="urn:oasis:names:tc:SAML:2.0:assertion" ID="_example" IssueInstant="${issueInstant}" Version="2.0">
    <saml2:Issuer>https://onelogin.example.com/metadata</saml2:Issuer>
    <saml2:Subject>
      <saml2:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">analyst@example.com</saml2:NameID>
      <saml2:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
        <saml2:SubjectConfirmationData NotOnOrAfter="${notOnOrAfter.toISOString()}" Recipient="https://api.example.com/saml/acs" />
      </saml2:SubjectConfirmation>
    </saml2:Subject>
    <saml2:Conditions NotBefore="${now.toISOString()}" NotOnOrAfter="${notOnOrAfter.toISOString()}">
      <saml2:AudienceRestriction>
        <saml2:Audience>${audience}</saml2:Audience>
      </saml2:AudienceRestriction>
    </saml2:Conditions>
    <saml2:AttributeStatement>
      <saml2:Attribute Name="email">
        <saml2:AttributeValue>analyst@example.com</saml2:AttributeValue>
      </saml2:Attribute>
      <saml2:Attribute Name="tenant">
        <saml2:AttributeValue>${tenant}</saml2:AttributeValue>
      </saml2:Attribute>
      <saml2:Attribute Name="http://schemas.xmlsoap.org/claims/Group">
        ${attributeValues}
      </saml2:Attribute>
    </saml2:AttributeStatement>
  </saml2:Assertion>`;

  return Buffer.from(xml, 'utf8').toString('base64');
}

describe('Federated identity middleware', () => {
  it('authenticates a valid SAML assertion and maps roles', async () => {
    const app = express();
    app.get('/secure', ensureAuthenticated, (req, res) => {
      res.json({
        method: res.getHeader('x-auth-method'),
        user: req.user,
      });
    });

    const response = await request(app)
      .get('/secure')
      .set('Authorization', `SAML ${buildSamlAssertion({})}`);

    expect(response.status).toBe(200);
    expect(response.body.method).toBe('saml');
    expect(response.body.user.identityProvider).toBe('saml');
    expect(response.body.user.roles).toContain('ANALYST');
    expect(response.body.user.role).toBe('ANALYST');
  });

  it('rejects assertions with mismatched audience', async () => {
    const app = express();
    app.get('/secure', ensureAuthenticated, (_req, res) => {
      res.json({ ok: true });
    });

    const response = await request(app)
      .get('/secure')
      .set('Authorization', `SAML ${buildSamlAssertion({ audience: 'urn:other:aud' })}`);

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Unauthorized');
  });
});
