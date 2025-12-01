/**
 * Type definitions for smart contract SDK
 */

export interface ContractConfig {
  address: string;
  chainId: number;
  rpcUrl: string;
  privateKey?: string;
  gasLimit?: number;
}

export interface TransactionReceipt {
  txHash: string;
  blockNumber: number;
  blockHash: string;
  gasUsed: number;
  status: 'success' | 'reverted';
  logs: ContractEvent[];
  timestamp: Date;
}

export interface ContractEvent {
  name: string;
  args: Record<string, unknown>;
  address: string;
  blockNumber: number;
  txHash: string;
}

export interface DataPoolState {
  poolId: string;
  owner: string;
  merkleRoot: string;
  contributorCount: number;
  totalContributions: number;
  createdAt: number;
  lastUpdated: number;
  paused: boolean;
}

export interface AccessGrant {
  grantId: string;
  poolId: string;
  grantee: string;
  accessLevel: number;
  expiresAt: number;
  revoked: boolean;
}

export interface MarketplaceListing {
  listingId: string;
  poolId: string;
  seller: string;
  price: bigint;
  currency: string;
  active: boolean;
  totalSales: number;
}

export interface ContributorReward {
  contributorId: string;
  poolId: string;
  amount: bigint;
  claimed: boolean;
  epoch: number;
}
