import { log } from './audit';
import { assertMfa, verifyOidcToken } from './oidc';
import { sessionManager } from './session';

interface User {
  username: string;
  password: string;
  sub: string;
  tenantId: string;
  roles: string[];
  clearance: string;
}

function getUsers(): Record<string, User> {
  const users: Record<string, User> = {};
  const username = process.env.AUTHZ_DEMO_USERNAME;
  const password = process.env.AUTHZ_DEMO_PASSWORD;

  if (username && password) {
    users[username] = {
      username,
      password,
      sub: username,
      tenantId: 'tenantA',
      roles: ['reader'],
      clearance: 'confidential',
    };
  }
  return users;
}

export async function login(username: string, password: string) {
  const users = getUsers();
  const user = users[username];
  if (!user || user.password !== password) {
    throw new Error('invalid_credentials');
  }
  const token = await sessionManager.createSession({
    sub: user.sub,
    tenantId: user.tenantId,
    roles: user.roles,
    clearance: user.clearance,
    acr: 'loa1',
    amr: ['pwd'],
  });
  await log({
    subject: user.sub,
    action: 'login',
    resource: 'self',
    tenantId: user.tenantId,
    allowed: true,
    reason: 'login',
  });
  return token;
}

export async function introspect(token: string) {
  const { payload } = await sessionManager.validate(token);
  return payload;
}

export async function oidcLogin(idToken: string) {
  const payload = await verifyOidcToken(idToken);
  if (!payload.sub) {
    throw new Error('missing_subject');
  }
  assertMfa(payload);
  const sessionToken = await sessionManager.createSession({
    ...payload,
    sub: String(payload.sub),
    acr: payload.acr || (payload.amr?.includes('hwk') ? 'loa2' : 'loa1'),
    amr: payload.amr || ['pwd'],
  });
  await log({
    subject: String(payload.sub),
    action: 'oidc_login',
    resource: 'self',
    tenantId: (payload as { tenantId?: string }).tenantId || 'unknown',
    allowed: true,
    reason: 'oidc_login',
  });
  return sessionToken;
}
