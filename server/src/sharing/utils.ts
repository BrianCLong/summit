import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { ShareTokenPayload, SharingScope } from './types.js';

const SHARE_SECRET = process.env.SHARE_TOKEN_SECRET || 'dev-share-secret';

export const computeScopeHash = (scope: SharingScope): string => {
  const normalized = JSON.stringify({ tenantId: scope.tenantId, caseId: scope.caseId || null });
  return crypto.createHash('sha256').update(normalized).digest('hex');
};

export const signShareToken = (payload: Omit<ShareTokenPayload, 'exp'>, expiresAt: Date): string => {
  const expSeconds = Math.floor(expiresAt.getTime() / 1000);
  const fullPayload: ShareTokenPayload = {
    ...payload,
    exp: expSeconds,
  };
  return jwt.sign(fullPayload, SHARE_SECRET);
};

export const verifyShareToken = (token: string): ShareTokenPayload => {
  return jwt.verify(token, SHARE_SECRET) as ShareTokenPayload;
};

export const planHash = (input: unknown): string => {
  const normalized = JSON.stringify(input, Object.keys(input as any).sort());
  return crypto.createHash('sha256').update(normalized).digest('hex');
};
