/**
 * Marketplace Contract - Manages on-chain data marketplace listings
 */

import type {
  ContractConfig,
  TransactionReceipt,
  MarketplaceListing,
} from '../types.js';
import { BaseContract } from './base-contract.js';

export class MarketplaceContract extends BaseContract {
  constructor(config: ContractConfig) {
    super(config);
  }

  async createListing(
    poolId: string,
    price: bigint,
    currency: string,
    metadata: string,
  ): Promise<TransactionReceipt> {
    return this.sendTransaction('createListing', [poolId, price, currency, metadata]);
  }

  async getListing(listingId: string): Promise<MarketplaceListing> {
    const result = await this.call('getListing', [listingId]);
    return {
      listingId: result.listingId,
      poolId: result.poolId,
      seller: result.seller,
      price: BigInt(result.price),
      currency: result.currency,
      active: result.active,
      totalSales: Number(result.totalSales),
    };
  }

  async purchaseAccess(
    listingId: string,
    buyer: string,
  ): Promise<TransactionReceipt> {
    return this.sendTransaction('purchaseAccess', [listingId, buyer]);
  }

  async updatePrice(listingId: string, newPrice: bigint): Promise<TransactionReceipt> {
    return this.sendTransaction('updatePrice', [listingId, newPrice]);
  }

  async deactivateListing(listingId: string): Promise<TransactionReceipt> {
    return this.sendTransaction('deactivateListing', [listingId]);
  }

  async reactivateListing(listingId: string): Promise<TransactionReceipt> {
    return this.sendTransaction('reactivateListing', [listingId]);
  }

  async getSellerListings(seller: string): Promise<MarketplaceListing[]> {
    const listings = await this.call('getSellerListings', [seller]);
    return listings.map((l: any) => ({
      listingId: l.listingId,
      poolId: l.poolId,
      seller: l.seller,
      price: BigInt(l.price),
      currency: l.currency,
      active: l.active,
      totalSales: Number(l.totalSales),
    }));
  }

  async getListingsByPool(poolId: string): Promise<MarketplaceListing[]> {
    const listings = await this.call('getListingsByPool', [poolId]);
    return listings.map((l: any) => ({
      listingId: l.listingId,
      poolId: l.poolId,
      seller: l.seller,
      price: BigInt(l.price),
      currency: l.currency,
      active: l.active,
      totalSales: Number(l.totalSales),
    }));
  }

  async withdrawEarnings(seller: string): Promise<TransactionReceipt> {
    return this.sendTransaction('withdrawEarnings', [seller]);
  }

  async getEarningsBalance(seller: string): Promise<bigint> {
    return this.call('getEarningsBalance', [seller]);
  }
}
