"use strict";
/**
 * Data Marketplace Service
 * Manages listings, transactions, and marketplace operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.marketplaceService = exports.MarketplaceService = void 0;
const uuid_1 = require("uuid");
const logger_js_1 = require("../utils/logger.js");
class MarketplaceService {
    listings = new Map();
    transactions = new Map();
    /**
     * Create a marketplace listing for a data product
     */
    async createListing(product, tenantId, options) {
        const listing = {
            id: (0, uuid_1.v4)(),
            productId: product.id,
            title: product.name,
            headline: options.headline,
            description: product.description,
            highlights: options.highlights || [],
            status: 'DRAFT',
            visibility: options.visibility || 'PUBLIC',
            featuredUntil: options.featuredUntil,
            analytics: {
                views: 0,
                inquiries: 0,
                purchases: 0,
                revenue: 0,
            },
            ratings: {
                average: 0,
                count: 0,
            },
            media: [],
            categories: [product.category],
            tags: product.useCases,
            tenantId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        this.listings.set(listing.id, listing);
        logger_js_1.logger.info({ listingId: listing.id }, 'Created marketplace listing');
        return listing;
    }
    /**
     * Publish a listing to make it active
     */
    async publishListing(listingId) {
        const listing = this.listings.get(listingId);
        if (!listing)
            throw new Error('Listing not found');
        listing.status = 'ACTIVE';
        listing.publishedAt = new Date().toISOString();
        listing.updatedAt = new Date().toISOString();
        logger_js_1.logger.info({ listingId }, 'Published listing');
        return listing;
    }
    /**
     * Search marketplace listings
     */
    async searchListings(params) {
        let results = Array.from(this.listings.values()).filter((l) => l.status === 'ACTIVE');
        if (params.query) {
            const q = params.query.toLowerCase();
            results = results.filter((l) => l.title.toLowerCase().includes(q) ||
                l.description.toLowerCase().includes(q) ||
                l.tags.some((t) => t.toLowerCase().includes(q)));
        }
        if (params.categories?.length) {
            results = results.filter((l) => l.categories.some((c) => params.categories.includes(c)));
        }
        if (params.visibility) {
            results = results.filter((l) => l.visibility === params.visibility);
        }
        const total = results.length;
        const offset = params.offset || 0;
        const limit = params.limit || 20;
        results = results.slice(offset, offset + limit);
        return { listings: results, total };
    }
    /**
     * Record a view on a listing
     */
    async recordView(listingId) {
        const listing = this.listings.get(listingId);
        if (listing) {
            listing.analytics.views++;
        }
    }
    /**
     * Record an inquiry on a listing
     */
    async recordInquiry(listingId) {
        const listing = this.listings.get(listingId);
        if (listing) {
            listing.analytics.inquiries++;
        }
    }
    /**
     * Process a purchase transaction
     */
    async processPurchase(listingId, contractId, productId, amountCents, providerId, consumerId, tenantId) {
        const transaction = {
            id: (0, uuid_1.v4)(),
            contractId,
            productId,
            type: 'PURCHASE',
            amountCents,
            currency: 'USD',
            status: 'PENDING',
            providerId,
            consumerId,
            metadata: { listingId },
            tenantId,
            createdAt: new Date().toISOString(),
        };
        // Simulate payment processing
        await this.simulatePaymentProcessing();
        transaction.status = 'COMPLETED';
        transaction.processedAt = new Date().toISOString();
        this.transactions.set(transaction.id, transaction);
        // Update listing analytics
        const listing = this.listings.get(listingId);
        if (listing) {
            listing.analytics.purchases++;
            listing.analytics.revenue += amountCents;
        }
        logger_js_1.logger.info({ transactionId: transaction.id, amountCents }, 'Purchase completed');
        return transaction;
    }
    async simulatePaymentProcessing() {
        // Simulate async payment processing
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    /**
     * Add a rating to a listing
     */
    async addRating(listingId, rating) {
        const listing = this.listings.get(listingId);
        if (!listing)
            throw new Error('Listing not found');
        const totalRatings = listing.ratings.average * listing.ratings.count + rating;
        listing.ratings.count++;
        listing.ratings.average = totalRatings / listing.ratings.count;
        listing.updatedAt = new Date().toISOString();
    }
    /**
     * Generate revenue report
     */
    async generateRevenueReport(tenantId, startDate, endDate) {
        const tenantTransactions = Array.from(this.transactions.values()).filter((t) => t.tenantId === tenantId &&
            t.createdAt >= startDate &&
            t.createdAt <= endDate &&
            t.status === 'COMPLETED');
        const totalRevenue = tenantTransactions.reduce((sum, t) => sum + t.amountCents, 0);
        // Group by product
        const byProduct = new Map();
        for (const tx of tenantTransactions) {
            const current = byProduct.get(tx.productId) || { revenueCents: 0, transactions: 0 };
            current.revenueCents += tx.amountCents;
            current.transactions++;
            byProduct.set(tx.productId, current);
        }
        return {
            period: { start: startDate, end: endDate },
            totalRevenueCents: totalRevenue,
            totalTransactions: tenantTransactions.length,
            byProduct: Array.from(byProduct.entries()).map(([productId, data]) => ({
                productId,
                productName: `Product ${productId.slice(0, 8)}`,
                ...data,
            })),
            byRegion: [], // Would be populated from actual geographic data
            trends: {
                revenueGrowthPercent: 0,
                transactionGrowthPercent: 0,
                averageOrderValueCents: tenantTransactions.length > 0
                    ? Math.round(totalRevenue / tenantTransactions.length)
                    : 0,
            },
        };
    }
    /**
     * Get featured listings
     */
    async getFeaturedListings(limit = 10) {
        const now = new Date().toISOString();
        return Array.from(this.listings.values())
            .filter((l) => l.status === 'ACTIVE' &&
            l.visibility === 'PUBLIC' &&
            l.featuredUntil &&
            l.featuredUntil > now)
            .sort((a, b) => b.analytics.views - a.analytics.views)
            .slice(0, limit);
    }
    /**
     * Get top-performing listings
     */
    async getTopListings(metric, limit = 10) {
        return Array.from(this.listings.values())
            .filter((l) => l.status === 'ACTIVE')
            .sort((a, b) => b.analytics[metric] - a.analytics[metric])
            .slice(0, limit);
    }
}
exports.MarketplaceService = MarketplaceService;
exports.marketplaceService = new MarketplaceService();
