import { Issuer, generators } from 'openid-client';
// import { ssoLogins, ssoErrors } from '../metrics/identity'; // Uncomment when OIDC callback handler is implemented

export async function buildOidcClient(orgId: string) {
  const cfg = await loadOidcCfg(orgId);
  const iss = await Issuer.discover(cfg.issuer);
  return new iss.Client({ client_id: cfg.clientId, client_secret: cfg.clientSecret, redirect_uris: [cfg.redirectUri], response_types: ['code'] });
}

// Placeholder for OIDC callback handler:
/*
export async function oidcCallback(req, res) {
  try {
    // ... OIDC callback handling logic ...
    // ssoLogins.labels('oidc', org.id).inc();
  } catch (e) {
    // ssoErrors.labels('oidc', org.id, 'auth_failed').inc();
  }
}
*/