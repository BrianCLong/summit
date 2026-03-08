"use strict";
/**
 * Marketplace Contract - Manages on-chain data marketplace listings
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketplaceContract = void 0;
const base_contract_js_1 = require("./base-contract.js");
class MarketplaceContract extends base_contract_js_1.BaseContract {
    constructor(config) {
        super(config);
    }
    async createListing(poolId, price, currency, metadata) {
        return this.sendTransaction('createListing', [poolId, price, currency, metadata]);
    }
    async getListing(listingId) {
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
    async purchaseAccess(listingId, buyer) {
        return this.sendTransaction('purchaseAccess', [listingId, buyer]);
    }
    async updatePrice(listingId, newPrice) {
        return this.sendTransaction('updatePrice', [listingId, newPrice]);
    }
    async deactivateListing(listingId) {
        return this.sendTransaction('deactivateListing', [listingId]);
    }
    async reactivateListing(listingId) {
        return this.sendTransaction('reactivateListing', [listingId]);
    }
    async getSellerListings(seller) {
        const listings = await this.call('getSellerListings', [seller]);
        return listings.map((l) => ({
            listingId: l.listingId,
            poolId: l.poolId,
            seller: l.seller,
            price: BigInt(l.price),
            currency: l.currency,
            active: l.active,
            totalSales: Number(l.totalSales),
        }));
    }
    async getListingsByPool(poolId) {
        const listings = await this.call('getListingsByPool', [poolId]);
        return listings.map((l) => ({
            listingId: l.listingId,
            poolId: l.poolId,
            seller: l.seller,
            price: BigInt(l.price),
            currency: l.currency,
            active: l.active,
            totalSales: Number(l.totalSales),
        }));
    }
    async withdrawEarnings(seller) {
        return this.sendTransaction('withdrawEarnings', [seller]);
    }
    async getEarningsBalance(seller) {
        return this.call('getEarningsBalance', [seller]);
    }
}
exports.MarketplaceContract = MarketplaceContract;
