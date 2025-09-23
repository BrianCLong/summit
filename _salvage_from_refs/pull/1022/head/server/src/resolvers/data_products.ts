import { issueLicense, verifyLicense, License } from '../products/ProductLicense';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const privKey = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
const products = [
  { id: 'count', name: 'Count', description: 'DP count', template: 'count', epsilonTiers: [0.1, 0.5], priceHint: '$' },
];
const entitlements: Record<string, License> = {};

export const DataProductsResolvers = {
  Query: {
    products: () => products,
    entitlements: (_: any, { tenantId }: { tenantId: string }) => Object.values(entitlements).filter(e => e.tenantId === tenantId),
  },
  Mutation: {
    issueEntitlement: (_: any, { tenantId, productId, epsilonCap, expiresAt }: any) => {
      const payload = { productId, tenantId, roomId: 'room', epsilonCap, expiresAt: Date.parse(expiresAt), scopes: ['count'] };
      const { payload: lic } = issueLicense(payload, privKey);
      entitlements[lic.jti] = lic as any;
      return { id: lic.jti, ...lic };
    },
    revokeEntitlement: (_: any, { id }: { id: string }) => {
      delete entitlements[id];
      return true;
    },
  },
};
