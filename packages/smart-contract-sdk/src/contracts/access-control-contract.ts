/**
 * Access Control Contract - Manages on-chain access permissions
 */

import type {
  ContractConfig,
  TransactionReceipt,
  AccessGrant,
} from '../types.js';
import { BaseContract } from './base-contract.js';

export enum AccessLevel {
  None = 0,
  Read = 1,
  Write = 2,
  Admin = 3,
}

export class AccessControlContract extends BaseContract {
  constructor(config: ContractConfig) {
    super(config);
  }

  async grantAccess(
    poolId: string,
    grantee: string,
    accessLevel: AccessLevel,
    expiresAt: number,
  ): Promise<TransactionReceipt> {
    return this.sendTransaction('grantAccess', [
      poolId,
      grantee,
      accessLevel,
      expiresAt,
    ]);
  }

  async revokeAccess(poolId: string, grantee: string): Promise<TransactionReceipt> {
    return this.sendTransaction('revokeAccess', [poolId, grantee]);
  }

  async getAccessGrant(grantId: string): Promise<AccessGrant> {
    const result = await this.call('getAccessGrant', [grantId]);
    return {
      grantId: result.grantId,
      poolId: result.poolId,
      grantee: result.grantee,
      accessLevel: Number(result.accessLevel),
      expiresAt: Number(result.expiresAt),
      revoked: result.revoked,
    };
  }

  async checkAccess(
    poolId: string,
    user: string,
    requiredLevel: AccessLevel,
  ): Promise<boolean> {
    return this.call('checkAccess', [poolId, user, requiredLevel]);
  }

  async updateAccessLevel(
    poolId: string,
    grantee: string,
    newLevel: AccessLevel,
  ): Promise<TransactionReceipt> {
    return this.sendTransaction('updateAccessLevel', [poolId, grantee, newLevel]);
  }

  async extendAccess(
    poolId: string,
    grantee: string,
    newExpiry: number,
  ): Promise<TransactionReceipt> {
    return this.sendTransaction('extendAccess', [poolId, grantee, newExpiry]);
  }

  async getPoolAccessList(poolId: string): Promise<AccessGrant[]> {
    const grants = await this.call('getPoolAccessList', [poolId]);
    return grants.map((g: any) => ({
      grantId: g.grantId,
      poolId: g.poolId,
      grantee: g.grantee,
      accessLevel: Number(g.accessLevel),
      expiresAt: Number(g.expiresAt),
      revoked: g.revoked,
    }));
  }

  async batchGrantAccess(
    poolId: string,
    grants: Array<{ grantee: string; level: AccessLevel; expiry: number }>,
  ): Promise<TransactionReceipt> {
    return this.sendTransaction('batchGrantAccess', [poolId, grants]);
  }
}
