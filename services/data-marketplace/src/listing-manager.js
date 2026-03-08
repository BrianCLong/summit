"use strict";
/**
 * Listing Manager - Manages data marketplace listings
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListingManager = void 0;
const crypto_1 = __importDefault(require("crypto"));
class ListingManager {
    listings = new Map();
    sellerListings = new Map();
    async createListing(listing) {
        const listingId = crypto_1.default.randomUUID();
        const stored = {
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
    async getListing(listingId) {
        const listing = this.listings.get(listingId);
        if (listing) {
            listing.views++;
        }
        return listing;
    }
    async searchListings(options) {
        const results = [];
        for (const [_, listing] of this.listings) {
            if (listing.status !== 'active') {
                continue;
            }
            if (options.query) {
                const searchText = `${listing.metadata.title} ${listing.metadata.description}`.toLowerCase();
                if (!searchText.includes(options.query.toLowerCase())) {
                    continue;
                }
            }
            if (options.tags?.length) {
                const hasTag = options.tags.some((t) => listing.metadata.tags.includes(t));
                if (!hasTag) {
                    continue;
                }
            }
            if (options.minPrice && listing.price.amount < options.minPrice) {
                continue;
            }
            if (options.maxPrice && listing.price.amount > options.maxPrice) {
                continue;
            }
            if (options.model && listing.price.model !== options.model) {
                continue;
            }
            results.push(listing);
        }
        return results.sort((a, b) => b.purchases - a.purchases);
    }
    async updateListing(listingId, updates) {
        const listing = this.listings.get(listingId);
        if (!listing) {
            return undefined;
        }
        Object.assign(listing, updates, { updatedAt: new Date() });
        return listing;
    }
    async pauseListing(listingId) {
        const listing = this.listings.get(listingId);
        if (!listing) {
            return false;
        }
        listing.status = 'paused';
        return true;
    }
    async recordPurchase(listingId) {
        const listing = this.listings.get(listingId);
        if (listing) {
            listing.purchases++;
        }
    }
    async getSellerListings(sellerId) {
        const ids = this.sellerListings.get(sellerId) || [];
        return ids
            .map((id) => this.listings.get(id))
            .filter((l) => l !== undefined);
    }
}
exports.ListingManager = ListingManager;
