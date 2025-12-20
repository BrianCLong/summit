/**
 * Smart Contract SDK
 *
 * Provides interfaces for blockchain smart contracts that manage
 * data pools, access rights, and marketplace transactions.
 */

export { DataPoolContract } from './contracts/data-pool-contract.js';
export { AccessControlContract } from './contracts/access-control-contract.js';
export { MarketplaceContract } from './contracts/marketplace-contract.js';
export { RewardDistributionContract } from './contracts/reward-distribution-contract.js';
export { ContractDeployer } from './deployer.js';

export type {
  ContractConfig,
  TransactionReceipt,
  ContractEvent,
  DataPoolState,
  AccessGrant,
  MarketplaceListing,
} from './types.js';
