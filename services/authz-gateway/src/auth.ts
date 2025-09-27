import { SignJWT, jwtVerify } from 'jose';
import { getPrivateKey, getPublicKey } from './keys';
import { log } from './audit';
import { getScimRoleMapper } from './scim';
import { loginWithOidc } from './oidc';
import { isPurposeAllowed } from './policy-pack';

export async function login(
  username: string,
  password: string,
  purpose: string,
) {
  if (!purpose) {
    throw new Error('purpose_required');
  }
  const oidcProfile = await loginWithOidc(username, password);
  const roleMapper = getScimRoleMapper();
  const roles = await roleMapper.getRolesForUser(
    oidcProfile.sub,
    oidcProfile.groups,
  );
  if (!roles.length) {
    throw new Error('no_roles_assigned');
  }
  if (!isPurposeAllowed(roles, purpose)) {
    throw new Error('purpose_not_allowed');
  }
  const token = await new SignJWT({
    sub: oidcProfile.sub,
    tenantId: oidcProfile.tenantId,
    roles,
    acr: oidcProfile.acr || 'loa1',
    purpose,
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'authz-gateway-1' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(getPrivateKey());
  await log({
    subject: oidcProfile.sub,
    action: 'login',
    resource: 'self',
    tenantId: oidcProfile.tenantId,
    purpose,
    allowed: true,
    reason: 'oidc_login',
  });
  return token;
}

export async function introspect(token: string) {
  const { payload } = await jwtVerify(token, getPublicKey());
  return payload;
}
