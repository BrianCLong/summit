import express from 'express';
import { AddressInfo } from 'net';
import { Server } from 'http';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';

export interface OidcUser {
  username: string;
  password: string;
  sub: string;
  tenant: string;
  acr?: string;
}

export interface OidcTestServer {
  server: Server;
  issuer: string;
}

export async function startOidcServer(
  users: OidcUser[],
): Promise<OidcTestServer> {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const publicJwk = await exportJWK(publicKey);
  publicJwk.alg = 'RS256';
  publicJwk.use = 'sig';
  publicJwk.kid = 'oidc-test';

  const app = express();
  app.use(express.urlencoded({ extended: false }));

  const userMap = new Map(users.map((user) => [user.username, user]));

  app.get('/.well-known/openid-configuration', (_req, res) => {
    const issuer = getIssuer(res);
    res.json({
      issuer,
      token_endpoint: `${issuer}/oauth/token`,
      jwks_uri: `${issuer}/.well-known/jwks.json`,
      grant_types_supported: ['password'],
      token_endpoint_auth_methods_supported: ['client_secret_basic'],
    });
  });

  app.get('/.well-known/jwks.json', (_req, res) => {
    res.json({ keys: [publicJwk] });
  });

  app.post('/oauth/token', async (req, res) => {
    const issuer = getIssuer(res);
    const auth = req.headers.authorization || '';
    const expected = `Basic ${Buffer.from('cos-client:cos-secret').toString('base64')}`;
    const clientId = req.body.client_id as string | undefined;
    const clientSecret = req.body.client_secret as string | undefined;
    const hasBasicAuth = auth === expected;
    const hasPostSecret =
      clientId === 'cos-client' && clientSecret === 'cos-secret';
    if (!hasBasicAuth && !hasPostSecret) {
      return res.status(401).json({ error: 'invalid_client' });
    }
    if (req.body.grant_type !== 'password') {
      return res.status(400).json({ error: 'unsupported_grant_type' });
    }
    const { username, password } = req.body;
    const user = userMap.get(username as string);
    if (!user || user.password !== password) {
      return res.status(400).json({ error: 'invalid_grant' });
    }
    const idToken = await new SignJWT({
      sub: user.sub,
      tenant: user.tenant,
      acr: user.acr || 'loa1',
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'oidc-test' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .setIssuer(issuer)
      .setAudience('cos-client')
      .sign(privateKey);
    res.json({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      expires_in: 3600,
      id_token: idToken,
      token_type: 'Bearer',
    });
  });

  const server = await new Promise<Server>((resolve) => {
    const srv = app.listen(0, () => resolve(srv));
  });
  const port = (server.address() as AddressInfo).port;
  return { server, issuer: `http://localhost:${port}` };
}

function getIssuer(res: express.Response) {
  const address = res.req?.socket.localAddress;
  const port = res.req?.socket.localPort;
  const host =
    address === '::ffff:127.0.0.1' || address === '::1' ? 'localhost' : address;
  return `http://${host}:${port}`;
}
