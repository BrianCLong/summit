import { SignJWT, jwtVerify } from 'jose';
import { getPrivateKey, getPublicKey } from './keys';
import { log } from './audit';
import {
  generateChallenge,
  pendingChallenge,
  registerCredential,
  RegistrationResponse,
  verifyAssertion,
  Assertion,
} from './webauthn';

interface User {
  username: string;
  password: string;
  sub: string;
  tenantId: string;
  roles: string[];
  clearance: string;
  mfaEnrolled?: boolean;
}

const users: Record<string, User> = {
  alice: {
    username: 'alice',
    password: 'password123',
    sub: 'alice',
    tenantId: 'tenantA',
    roles: ['reader'],
    clearance: 'confidential',
  },
};

export async function login(username: string, password: string) {
  const user = users[username];
  if (!user || user.password !== password) {
    throw new Error('invalid_credentials');
  }
  const token = await new SignJWT({
    sub: user.sub,
    tenantId: user.tenantId,
    roles: user.roles,
    clearance: user.clearance,
    acr: 'loa1',
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'authz-gateway-1' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(getPrivateKey());
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
  const { payload } = await jwtVerify(token, getPublicKey());
  return payload;
}

export function initiateWebAuthnEnrollment(username: string) {
  const user = users[username];
  if (!user) {
    throw new Error('user_not_found');
  }

  const challenge = generateChallenge({
    userId: user.sub,
    tenantId: user.tenantId,
    purposeTags: ['support'],
  });

  return challenge;
}

export async function completeWebAuthnEnrollment(
  username: string,
  response: RegistrationResponse,
) {
  const user = users[username];
  if (!user) {
    throw new Error('user_not_found');
  }

  await registerCredential(response);
  user.mfaEnrolled = true;
}

export async function completeWebAuthnStepUp(
  username: string,
  assertion: Assertion,
) {
  const user = users[username];
  if (!user) {
    throw new Error('user_not_found');
  }

  const challenge = pendingChallenge(user.sub);
  if (!challenge) {
    throw new Error('challenge_missing');
  }

  const verified = await verifyAssertion(assertion);
  if (!verified) {
    throw new Error('webauthn_verification_failed');
  }

  const token = await new SignJWT({
    sub: user.sub,
    tenantId: user.tenantId,
    roles: user.roles,
    clearance: user.clearance,
    acr: 'loa3',
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'authz-gateway-1' })
    .setIssuedAt()
    .setExpirationTime('30m')
    .sign(getPrivateKey());

  await log({
    subject: user.sub,
    action: 'mfa_step_up',
    resource: 'self',
    tenantId: user.tenantId,
    allowed: true,
    reason: 'webauthn_verified',
  });

  return token;
}
