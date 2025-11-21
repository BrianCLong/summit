/**
 * Tests for Smart Contract SDK
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { DataPoolContract } from '../contracts/data-pool-contract.js';
import { AccessControlContract, AccessLevel } from '../contracts/access-control-contract.js';
import { MarketplaceContract } from '../contracts/marketplace-contract.js';
import { ContractDeployer } from '../deployer.js';

const mockConfig = {
  address: '0x' + '1'.repeat(40),
  chainId: 1,
  rpcUrl: 'http://localhost:8545',
};

describe('DataPoolContract', () => {
  let contract: DataPoolContract;

  beforeEach(() => {
    contract = new DataPoolContract(mockConfig);
  });

  describe('createPool', () => {
    it('should create a pool and return transaction receipt', async () => {
      const receipt = await contract.createPool(
        'pool-1',
        '0x' + 'a'.repeat(64),
        JSON.stringify({ name: 'Test Pool' }),
      );

      expect(receipt.txHash).toMatch(/^0x/);
      expect(receipt.status).toBe('success');
      expect(receipt.gasUsed).toBeGreaterThan(0);
    });
  });

  describe('getPoolState', () => {
    it('should return pool state', async () => {
      const state = await contract.getPoolState('pool-1');

      expect(state.poolId).toBe('pool-1');
      expect(state.owner).toBeDefined();
      expect(state.merkleRoot).toMatch(/^0x/);
      expect(typeof state.contributorCount).toBe('number');
    });
  });

  describe('verifyContribution', () => {
    it('should verify contribution proof', async () => {
      const isValid = await contract.verifyContribution(
        'pool-1',
        'contentHash123',
        ['proof1', 'proof2'],
      );

      expect(typeof isValid).toBe('boolean');
    });
  });
});

describe('AccessControlContract', () => {
  let contract: AccessControlContract;

  beforeEach(() => {
    contract = new AccessControlContract(mockConfig);
  });

  describe('grantAccess', () => {
    it('should grant access and return receipt', async () => {
      const receipt = await contract.grantAccess(
        'pool-1',
        '0x' + '2'.repeat(40),
        AccessLevel.Read,
        Math.floor(Date.now() / 1000) + 86400,
      );

      expect(receipt.status).toBe('success');
    });
  });

  describe('checkAccess', () => {
    it('should check access level', async () => {
      const hasAccess = await contract.checkAccess(
        'pool-1',
        '0x' + '2'.repeat(40),
        AccessLevel.Read,
      );

      expect(typeof hasAccess).toBe('boolean');
    });
  });
});

describe('MarketplaceContract', () => {
  let contract: MarketplaceContract;

  beforeEach(() => {
    contract = new MarketplaceContract(mockConfig);
  });

  describe('createListing', () => {
    it('should create marketplace listing', async () => {
      const receipt = await contract.createListing(
        'pool-1',
        BigInt(100),
        'USD',
        JSON.stringify({ title: 'Test Listing' }),
      );

      expect(receipt.status).toBe('success');
    });
  });

  describe('purchaseAccess', () => {
    it('should execute purchase', async () => {
      const receipt = await contract.purchaseAccess(
        'listing-1',
        '0x' + '3'.repeat(40),
      );

      expect(receipt.txHash).toMatch(/^0x/);
      expect(receipt.status).toBe('success');
    });
  });
});

describe('ContractDeployer', () => {
  let deployer: ContractDeployer;

  beforeEach(() => {
    deployer = new ContractDeployer('http://localhost:8545', '0x' + 'f'.repeat(64));
  });

  describe('deployFullEcosystem', () => {
    it('should deploy all contracts', async () => {
      const result = await deployer.deployFullEcosystem({
        owner: '0x' + '1'.repeat(40),
        feePercent: 2,
        tokenAddress: '0x' + '4'.repeat(40),
      });

      expect(result.dataPool.address).toMatch(/^0x/);
      expect(result.accessControl.address).toMatch(/^0x/);
      expect(result.marketplace.address).toMatch(/^0x/);
      expect(result.rewardDistribution.address).toMatch(/^0x/);
    });
  });
});
