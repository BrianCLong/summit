/**
 * Listing Manager - Manages data marketplace listings
 */

import crypto from 'crypto';
import type { Listing } from './index.js';

interface StoredListing extends Listing {
  id: string;
  status: 'active' | 'paused' | 'sold' | 'expired';
  createdAt: Date;
  updatedAt: Date;
  views: number;
  purchases: number;
}

interface SearchOptions {
  query?: string;
  tags?: string[];
  minPrice?: number;
  maxPrice?: number;
  model?: string;
}

export class ListingManager {
  private listings: Map<string, StoredListing> = new Map();
  private sellerListings: Map<string, string[]> = new Map();

  async createListing(listing: Listing): Promise<{ listingId: string }> {
    const listingId = crypto.randomUUID();
    const stored: StoredListing = {
      ...listing,
      id: listingId,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      views: 0,
      purchases: 0,
    };

    this.listings.set(listingId, stored);

    const sellerIds = this.sellerListings.get(listing.sellerId) || [];
    sellerIds.push(listingId);
    this.sellerListings.set(listing.sellerId, sellerIds);

    return { listingId };
  }

  async getListing(listingId: string): Promise<StoredListing | undefined> {
    const listing = this.listings.get(listingId);
    if (listing) {
      listing.views++;
    }
    return listing;
  }

  async searchListings(options: SearchOptions): Promise<StoredListing[]> {
    const results: StoredListing[] = [];

    for (const [_, listing] of this.listings) {
      if (listing.status !== 'active') continue;

      if (options.query) {
        const searchText = `${listing.metadata.title} ${listing.metadata.description}`.toLowerCase();
        if (!searchText.includes(options.query.toLowerCase())) continue;
      }

      if (options.tags?.length) {
        const hasTag = options.tags.some((t) => listing.metadata.tags.includes(t));
        if (!hasTag) continue;
      }

      if (options.minPrice && listing.price.amount < options.minPrice) continue;
      if (options.maxPrice && listing.price.amount > options.maxPrice) continue;
      if (options.model && listing.price.model !== options.model) continue;

      results.push(listing);
    }

    return results.sort((a, b) => b.purchases - a.purchases);
  }

  async updateListing(
    listingId: string,
    updates: Partial<Listing>,
  ): Promise<StoredListing | undefined> {
    const listing = this.listings.get(listingId);
    if (!listing) return undefined;

    Object.assign(listing, updates, { updatedAt: new Date() });
    return listing;
  }

  async pauseListing(listingId: string): Promise<boolean> {
    const listing = this.listings.get(listingId);
    if (!listing) return false;
    listing.status = 'paused';
    return true;
  }

  async recordPurchase(listingId: string): Promise<void> {
    const listing = this.listings.get(listingId);
    if (listing) {
      listing.purchases++;
    }
  }

  async getSellerListings(sellerId: string): Promise<StoredListing[]> {
    const ids = this.sellerListings.get(sellerId) || [];
    return ids
      .map((id) => this.listings.get(id))
      .filter((l): l is StoredListing => l !== undefined);
  }
}
